# slr_analyzer.py
import cv2
import mediapipe as mp
import numpy as np
from collections import defaultdict
import logging
import base64

logger = logging.getLogger(__name__)

class SLRExerciseAnalyzer:
    def __init__(self, exercise="straight_leg_raises_rehab", delay_seconds=3, target_reps = 8, fps=30):
        # Initialize MediaPipe Pose
        self.mp_pose = mp.solutions.pose
        self.mp_drawing = mp.solutions.drawing_utils
        self.pose = self.mp_pose.Pose()

        # Thresholds for rehab straight leg raises
        self.THRESHOLDS = {
            "affected_leg_target_angle": (10, 30),  # Tolerance around target angle
            "affected_leg_straightness": (160, 180),  # Affected leg should be straight
            "non_affected_knee_angle": (60, 120),  # Knee bend range
            "torso_angle": (0, 30),  # Torso flat on ground
            "hip_movement": (0, 0.15)  # Max allowed hip movement (normalized units)
        }

        # Recording and rep counting settings
        self.fps = fps
        self.delay_frames = delay_seconds * fps  # 3-second delay before correction
        self.target_reps = target_reps  # Number of reps to detect
        self.frame_count = 0
        self.recording = False  # Now indicates correction active
        self.report = {
            "good_form_frames": 0,
            "error_counts": defaultdict(int)
        }

        self.is_above_30 = False

        # Rep counting variables
        self.reps = 0
        self.prev_affected_angle = None
        self.leg_raised = False
        self.target_angle = None

        self.peak_leg_angle = 180
        self.shallow_rep_detected = False

        # Hip movement tracking
        self.initial_hip_y = None  # Baseline hip position

    def calculate_angle(self, p1, p2, p3):
        """Calculate the angle between three points in degrees."""
        a = np.array(p1)
        b = np.array(p2)
        c = np.array(p3)
        ba = a - b
        bc = c - b
        cosine_angle = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc))
        angle = np.arccos(cosine_angle) * 180 / np.pi
        return angle

    def check_straight_leg_raises_rehab(self, landmarks):
        """Analyze rehab straight leg raises and return top 3 errors."""
        errors = []

        # Extract key landmarks
        l_hip = [landmarks[self.mp_pose.PoseLandmark.LEFT_HIP].x, landmarks[self.mp_pose.PoseLandmark.LEFT_HIP].y]
        r_hip = [landmarks[self.mp_pose.PoseLandmark.RIGHT_HIP].x, landmarks[self.mp_pose.PoseLandmark.RIGHT_HIP].y]
        l_knee = [landmarks[self.mp_pose.PoseLandmark.LEFT_KNEE].x, landmarks[self.mp_pose.PoseLandmark.LEFT_KNEE].y]
        r_knee = [landmarks[self.mp_pose.PoseLandmark.RIGHT_KNEE].x, landmarks[self.mp_pose.PoseLandmark.RIGHT_KNEE].y]
        l_ankle = [landmarks[self.mp_pose.PoseLandmark.LEFT_ANKLE].x, landmarks[self.mp_pose.PoseLandmark.LEFT_ANKLE].y]
        r_ankle = [landmarks[self.mp_pose.PoseLandmark.RIGHT_ANKLE].x, landmarks[self.mp_pose.PoseLandmark.RIGHT_ANKLE].y]
        l_shoulder = [landmarks[self.mp_pose.PoseLandmark.LEFT_SHOULDER].x, landmarks[self.mp_pose.PoseLandmark.LEFT_SHOULDER].y]
        r_shoulder = [landmarks[self.mp_pose.PoseLandmark.RIGHT_SHOULDER].x, landmarks[self.mp_pose.PoseLandmark.RIGHT_SHOULDER].y]

        # Calculate torso angle
        mid_hip = [(l_hip[0] + r_hip[0]) / 2, (l_hip[1] + r_hip[1]) / 2]
        mid_shoulder = [(l_shoulder[0] + r_shoulder[0]) / 2, (l_shoulder[1] + r_shoulder[1]) / 2]
        torso_angle = self.calculate_angle(mid_hip, mid_shoulder, [mid_hip[0] + 1, mid_hip[1]])  # Horizontal

        # Set initial hip position (once at start)
        if self.initial_hip_y is None:
            self.initial_hip_y = mid_hip[1]

        # Check hip movement
        hip_deviation = abs(mid_hip[1] - self.initial_hip_y)
        #if not self.THRESHOLDS["hip_movement"][0] <= hip_deviation <= self.THRESHOLDS["hip_movement"][1]:
        #    errors.append("Keep your hips on the ground")

        # Determine affected and non-affected legs
        left_knee_angle = self.calculate_angle(l_hip, l_knee, l_ankle)
        right_knee_angle = self.calculate_angle(r_hip, r_knee, r_ankle)
        if left_knee_angle < right_knee_angle:  # Left leg is non-affected (bent)
            non_affected_hip, non_affected_knee, non_affected_ankle = l_hip, l_knee, l_ankle
            affected_hip, affected_knee, affected_ankle = r_hip, r_knee, r_ankle
            affected_leg_angle = self.calculate_angle(r_hip, r_knee, r_ankle)
            non_affected_leg_angle = self.calculate_angle(l_hip, l_knee, mid_hip)
        else:  # Right leg is non-affected (bent)
            non_affected_hip, non_affected_knee, non_affected_ankle = r_hip, r_knee, r_ankle
            affected_hip, affected_knee, affected_ankle = l_hip, l_knee, l_ankle
            affected_leg_angle = self.calculate_angle(l_hip, l_knee, l_ankle)
            non_affected_leg_angle = self.calculate_angle(r_hip, r_knee, mid_hip)
            
        target_angle = self.calculate_angle(mid_hip, non_affected_hip, non_affected_knee)
        self.target_angle = target_angle if self.target_angle is None else self.target_angle

        # Affected leg angle relative to torso
        affected_torso_angle = self.calculate_angle(mid_hip, affected_hip, affected_knee)

        leg_angle = self.calculate_angle(r_shoulder, r_hip, r_knee)

        if affected_leg_angle < 160:
            errors.append("Keep your leg straight.")
        if leg_angle < 120:
            errors.append("Leg is too high.")

        if self.is_above_30:
            self.peak_leg_angle = min(self.peak_leg_angle, leg_angle)

        if self.shallow_rep_detected == True:
            errors.append("Shallow rep, raise leg higher next time.")
        
        # Rep counting logic
        if leg_angle < 140 and not self.is_above_30:
            # Leg has just gone above 30 degrees
            self.is_above_30 = True
            self.shallow_rep_detected = False
        elif leg_angle > 140 and self.is_above_30:
            # Leg has come back down from above 30
            self.is_above_30 = False
            self.reps += 1  # Increment rep count

            if self.peak_leg_angle > 130:
                self.shallow_rep_detected = True
                self.reps -= 1
                
                
            self.peak_leg_angle = 180
        
        return errors[:3], leg_angle

    def reset_counters(self):
        """Reset counters and recording state."""
        self.frame_count = 0
        self.recording = False
        self.start_frame = 0
        self.reps = 0
        self.leg_raised = False
        self.prev_affected_angle = None
        self.report = {
            "good_form_frames": 0,
            "error_counts": {}
        }

    async def process_video(self, frame):
        """Process a single frame and return data to broadcast."""
        # Process the frame with MediaPipe Pose
        results = self.pose.process(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        annotated_frame = frame.copy()  # Create a copy to annotate
        error_text = ""

        if results.pose_landmarks:
            self.mp_drawing.draw_landmarks(annotated_frame, results.pose_landmarks, self.mp_pose.POSE_CONNECTIONS)
            self.frame_count += 1

            # Display countdown during delay
            if self.frame_count <= self.delay_frames:
                countdown = int(self.delay_frames / self.fps) - int(self.frame_count / self.fps)
                cv2.putText(annotated_frame, f"Starting in: {countdown}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
            else:
                # Start correction after delay
                if not self.recording:
                    self.recording = True
                    self.start_frame = self.frame_count

                errors, affected_torso_angle = self.check_straight_leg_raises_rehab(results.pose_landmarks.landmark)

                # Record form data during correction
                if self.recording:
                    if not errors:
                        self.report["good_form_frames"] += 1
                    for error in errors:
                        if error not in self.report["error_counts"]:
                            self.report["error_counts"][error] = 0
                        self.report["error_counts"][error] += 1

                # Display feedback after delay
                if self.recording:
                    if errors:
                        for i, error in enumerate(errors):
                            cv2.putText(annotated_frame, error, (10, 30 + i * 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
                    else:
                        cv2.putText(annotated_frame, "Correct Form", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)

                # Display rep count
                cv2.putText(annotated_frame, f"Reps: {self.reps}/{self.target_reps}", (10, annotated_frame.shape[0] - 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 0), 2)
            ### TEXT TO SPEECH PORTION
                # error_text = errors[0] if errors else "You are doing well."
                error_text += errors[1] if errors[1]
                if errors:
                    error_text = errors[0]
                    if errors[1]:
                        error_text += errors[1]
                else:
                    error_text = "You are doing well."


        


        # Encode frame as base64 and return data
        frame_base64 = self._encode_frame(annotated_frame)
        return {
            "type": "frame",
            "data": frame_base64,
            "reps": self.reps,
            "target_reps": self.target_reps,
            "good_form_frames": self.report["good_form_frames"],
            "error_counts": self.report["error_counts"],
            "recording": self.recording,
            "frame_count": self.frame_count - self.start_frame if self.recording else 0,
            "error_text": error_text
        }

    def _encode_frame(self, frame):
        """Encode frame as base64."""
        _, buffer = cv2.imencode('.jpg', frame)
        return base64.b64encode(buffer).decode('utf-8')

    def generate_report(self):
        """Generate and print an exercise report."""
        total_recorded_frames = self.frame_count - self.start_frame  # Frames from start of correction
        good_form_seconds = self.report["good_form_frames"] / self.fps
        total_seconds = total_recorded_frames / self.fps
    
        print("\n--- Straight Leg Raises (Rehab) Exercise Report ---")
        print(f"Total Recorded Time: {total_seconds:.2f} seconds")
        print(f"Good Form Duration: {good_form_seconds:.2f} seconds ({(good_form_seconds / total_seconds) * 100:.1f}%)")
        print(f"Repetitions Completed: {self.reps}")
        print("Errors Detected:")
        if self.report["error_counts"]:
            for error, count in self.report["error_counts"].items():
                error_seconds = count / self.fps
                print(f"  - '{error}': {count} frames ({error_seconds:.2f} seconds, {(count / total_recorded_frames) * 100:.1f}%)")
        else:
            print("  - No errors detected!")
        print("--------------------------------\n")

    def run(self):
        """Run the analyzer with webcam input."""
        cap = cv2.VideoCapture(0)
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
    
            frame = self.process_frame(frame)
            cv2.imshow("Straight Leg Raises (Rehab) Correction", frame)
    
            if self.recording and self.reps >= self.target_reps:
                self.generate_report()
                break
    
            if cv2.waitKey(1) & 0xFF == ord('q'):
                if self.recording:
                    self.generate_report()
                break
    
        cap.release()
        cv2.destroyAllWindows()
        self.pose.close()

    def __del__(self):
        self.pose.close()