# slr_analyzer.py
import cv2
import mediapipe as mp
import numpy as np
from collections import defaultdict
import logging
import base64

logger = logging.getLogger(__name__)



class SLRExerciseAnalyzer:
    def __init__(self, exercise="straight_leg_raises_rehab", delay_seconds=8, target_reps=8, fps=30):
        # Initialize MediaPipe Pose
        self.mp_pose = mp.solutions.pose
        self.mp_drawing = mp.solutions.drawing_utils
        self.pose = self.mp_pose.Pose()

        # Thresholds for rehab straight leg raises
        self.THRESHOLDS = {
            "affected_leg_target_angle": 20,  # Tolerance around target angle
            "affected_leg_straightness": (160, 180),  # Affected leg should be straight
            "non_affected_knee_angle": (60, 120),  # Knee bend range
        }

        # Recording and rep counting settings
        self.fps = fps
        self.delay_frames = delay_seconds * fps  # delay before correction
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
        self.leg_raised = False
        self.target_angle = None
        
        # Side determination
        self.affected_side = None  # 'left' or 'right'
        self.affected_shoulder = None
        self.affected_hip = None
        self.affected_knee = None
        self.affected_ankle = None
        self.non_affected_ankle = None

    def calculate_angle(self, p1, p2, p3):
        """Calculate the angle between three points in degrees."""
        a = np.array(p1)
        b = np.array(p2)
        c = np.array(p3)
        ba = a - b
        bc = c - b
        cosine_angle = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc))
        cosine_angle = np.clip(cosine_angle, -1.0, 1.0)  # Ensure within valid range
        angle = np.arccos(cosine_angle) * 180 / np.pi
        return angle

    def determine_sides(self, landmarks):
        """Determine affected and non-affected sides based on leg positions."""
        # Extract key landmarks
        l_hip = [landmarks[self.mp_pose.PoseLandmark.LEFT_HIP].x, landmarks[self.mp_pose.PoseLandmark.LEFT_HIP].y]
        r_hip = [landmarks[self.mp_pose.PoseLandmark.RIGHT_HIP].x, landmarks[self.mp_pose.PoseLandmark.RIGHT_HIP].y]
        l_knee = [landmarks[self.mp_pose.PoseLandmark.LEFT_KNEE].x, landmarks[self.mp_pose.PoseLandmark.LEFT_KNEE].y]
        r_knee = [landmarks[self.mp_pose.PoseLandmark.RIGHT_KNEE].x, landmarks[self.mp_pose.PoseLandmark.RIGHT_KNEE].y]
        l_ankle = [landmarks[self.mp_pose.PoseLandmark.LEFT_ANKLE].x, landmarks[self.mp_pose.PoseLandmark.LEFT_ANKLE].y]
        r_ankle = [landmarks[self.mp_pose.PoseLandmark.RIGHT_ANKLE].x, landmarks[self.mp_pose.PoseLandmark.RIGHT_ANKLE].y]
        l_shoulder = [landmarks[self.mp_pose.PoseLandmark.LEFT_SHOULDER].x, landmarks[self.mp_pose.PoseLandmark.LEFT_SHOULDER].y]
        r_shoulder = [landmarks[self.mp_pose.PoseLandmark.RIGHT_SHOULDER].x, landmarks[self.mp_pose.PoseLandmark.RIGHT_SHOULDER].y]

        # Determine affected and non-affected legs based on which knee is more bent
        left_knee_angle = self.calculate_angle(l_hip, l_knee, l_ankle)
        right_knee_angle = self.calculate_angle(r_hip, r_knee, r_ankle)
        
        if left_knee_angle < right_knee_angle:  # Left leg is non-affected (bent)
            self.affected_side = 'right'
            self.affected_shoulder = r_shoulder
            self.affected_hip = r_hip
            self.affected_knee = r_knee
            self.affected_ankle = r_ankle
            self.non_affected_knee = l_knee
        else:  # Right leg is non-affected (bent)
            self.affected_side = 'left'
            self.affected_shoulder = l_shoulder
            self.affected_hip = l_hip
            self.affected_knee = l_knee
            self.affected_ankle = l_ankle
            self.non_affected_knee = r_knee
            
        # Calculate target angle using affected shoulder, affected hip, non-affected knee
        target_angle = self.calculate_angle(self.affected_shoulder, self.affected_hip, self.non_affected_knee)
        return target_angle

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

        # Determine sides if not determined yet, or if starting a new rep
        if self.affected_side is None or (not self.is_above_30):
            new_target_angle = self.determine_sides(landmarks)
            if not self.is_above_30:  # Only update target angle at start of rep
                self.target_angle = new_target_angle
        
        # Calculate affected leg straightness
        affected_leg_angle = self.calculate_angle(
            self.affected_hip, 
            self.affected_knee, 
            self.affected_ankle
        )
        
        # Calculate leg raise angle (using affected shoulder, hip, knee)
        leg_raise_angle = self.calculate_angle(
            self.affected_shoulder,
            self.affected_hip, 
            self.affected_knee
        )
        
        # Check leg straightness
        if not self.THRESHOLDS["affected_leg_straightness"][0] <= affected_leg_angle:
            errors.append("Keep your leg straight")
        
        # Check if leg is raised to target angle (with tolerance)
        min_target = self.target_angle + self.THRESHOLDS["affected_leg_target_angle"]
        max_target = self.target_angle - self.THRESHOLDS["affected_leg_target_angle"]
        
        if leg_raise_angle < min_target:
            errors.append("Raise your leg higher")
        elif leg_raise_angle > max_target:
            errors.append("Leg too high")
        
        # Rep counting logic - only count when leg is properly lowered
        if leg_raise_angle < 150 and not self.is_above_30:
            # Leg has just gone above 30 degrees
            self.is_above_30 = True
        elif leg_raise_angle >= 150 and self.is_above_30:
            # Leg has come back down from above 30
            self.is_above_30 = False
            self.reps += 1  # Increment rep count
        
        return errors[:3], leg_raise_angle

    def process_frame(self, frame):
        """Process a single frame, count reps, and return annotated frame and errors."""
        results = self.pose.process(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        errors = []
        leg_raise_angle = None
        
        if results.pose_landmarks:
            self.mp_drawing.draw_landmarks(frame, results.pose_landmarks, self.mp_pose.POSE_CONNECTIONS)
            self.frame_count += 1

            # Display countdown during delay
            if self.frame_count <= self.delay_frames:
                countdown = int(self.delay_frames / self.fps) - int(self.frame_count / self.fps)
                cv2.putText(frame, f"Starting in: {countdown}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
            else:
                # Start correction after delay
                if not self.recording:
                    self.recording = True
                    self.start_frame = self.frame_count

                errors, leg_raise_angle = self.check_straight_leg_raises_rehab(results.pose_landmarks.landmark)

                # Record form data during correction
                if self.recording:
                    if not errors:
                        self.report["good_form_frames"] += 1
                    for error in errors:
                        self.report["error_counts"][error] += 1

                # Display only basic information on frame, not errors
                if self.recording:
                    # Display affected side
                    side_text = f"Affected side: {self.affected_side}" if self.affected_side else "Determining side..."
                    cv2.putText(frame, side_text, (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 0), 2)
                    
                    # Display target angle
                    if self.target_angle is not None:
                        cv2.putText(frame, f"Target angle: {self.target_angle:.1f}°", (10, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 0), 2)
                    
                    # Display current leg angle
                    cv2.putText(frame, f"Current angle: {leg_raise_angle:.1f}°", (10, 120), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 0), 2)
                
                # Display rep count
                cv2.putText(frame, f"Reps: {self.reps}/{self.target_reps}", (10, frame.shape[0] - 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 0), 2)

        return frame, errors, leg_raise_angle
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
        """Run the analyzer with webcam input and save to video."""
        cap = cv2.VideoCapture(0)
        
        # Define video writer parameters
        fourcc = cv2.VideoWriter_fourcc(*'XVID')  # Codec
        output_file = 'leg_raise_output.avi'      # Output filename
        fps = 20.0                               # Frames per second
        frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        
        # Initialize video writer
        out = cv2.VideoWriter(output_file, fourcc, fps, (frame_width, frame_height))
        
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
        
            # Process the frame
            processed_frame = self.process_frame(frame)
            
            # Write the processed frame to video file
            out.write(processed_frame)
            
            # Display the frame
            cv2.imshow("Straight Leg Raises (Rehab) Correction", processed_frame)
        
            if self.recording and self.reps >= self.target_reps:
                self.generate_report()
                break
        
            if cv2.waitKey(1) & 0xFF == ord('q'):
                if self.recording:
                    self.generate_report()
                break
        
        # Release resources
        cap.release()
        out.release()  # Release the video writer
        cv2.destroyAllWindows()
        self.pose.close()
    
    def __del__(self):
        self.pose.close()
    def __init__(self, exercise="straight_leg_raises_rehab", delay_seconds=8, target_reps = 8, fps=30):
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

        # Rep counting variables
        self.reps = 0
        self.prev_affected_angle = None
        self.leg_raised = False
        self.target_angle = None

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

        # Check form
        if not (self.target_angle - self.THRESHOLDS["affected_leg_target_angle"][0] <= affected_torso_angle <= self.target_angle + self.THRESHOLDS["affected_leg_target_angle"][1]):
            errors.append("Raise your affected leg higher" if affected_torso_angle < self.target_angle - 10 else "Lower your affected leg slightly")
        if not self.THRESHOLDS["affected_leg_straightness"][0] <= affected_leg_angle <= self.THRESHOLDS["affected_leg_straightness"][1]:
            errors.append("Keep your affected leg straight")
        if not self.THRESHOLDS["non_affected_knee_angle"][0] <= min(left_knee_angle, right_knee_angle) <= self.THRESHOLDS["non_affected_knee_angle"][1]:
            errors.append("Bend your non-affected knee more" if min(left_knee_angle, right_knee_angle) > 120 else "Straighten your non-affected knee slightly")
        #if not self.THRESHOLDS["torso_angle"][0] <= torso_angle <= self.THRESHOLDS["torso_angle"][1]:
        #    errors.append("Keep your back flat on the ground")

        return errors[:3], affected_torso_angle

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

                # Rep counting logic
                if self.target_angle is not None and self.prev_affected_angle is not None:
                    if not self.leg_raised and affected_torso_angle > (self.target_angle - 10):
                        self.leg_raised = True
                    elif self.leg_raised and affected_torso_angle < 20:
                        self.leg_raised = False
                        self.reps += 1
                self.prev_affected_angle = affected_torso_angle

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
            "frame_count": self.frame_count - self.start_frame if self.recording else 0
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