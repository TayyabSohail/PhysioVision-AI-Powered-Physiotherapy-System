import cv2
import mediapipe as mp
import numpy as np
from collections import defaultdict
import time
import base64


class WarriorPoseAnalyzer:
    def __init__(self, record_seconds=10, fps=30):
        # Initialize MediaPipe Pose
        self.mp_pose = mp.solutions.pose
        self.mp_drawing = mp.solutions.drawing_utils
        self.pose = self.mp_pose.Pose()

        # Define adjustable thresholds
        self.THRESHOLDS = {
            "front_knee_angle": (70, 120),
            "back_leg_angle": (150, 180),
            "hip_orientation": (0, 30),
            "torso_angle": (0, 100),
            "arm_angle": (155, 190),
            "shoulder_hip_alignment": (0, 40)
        }

        # Recording settings
        self.fps = fps
        self.delay_frames = 3 * fps  # 3 seconds delay
        self.record_frames = record_seconds * fps  # Number of frames to record
        self.frame_count = 0
        self.recording = False
        self.report = {
            "good_form_frames": 0,
            "error_counts": defaultdict(int)  # Tracks each error's frequency
        }

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

    def check_warrior_pose(self, landmarks):
        """Analyze Warrior II pose and return top 3 errors."""
        errors = []

        l_hip = [landmarks[self.mp_pose.PoseLandmark.LEFT_HIP].x, landmarks[self.mp_pose.PoseLandmark.LEFT_HIP].y]
        r_hip = [landmarks[self.mp_pose.PoseLandmark.RIGHT_HIP].x, landmarks[self.mp_pose.PoseLandmark.RIGHT_HIP].y]
        l_knee = [landmarks[self.mp_pose.PoseLandmark.LEFT_KNEE].x, landmarks[self.mp_pose.PoseLandmark.LEFT_KNEE].y]
        r_knee = [landmarks[self.mp_pose.PoseLandmark.RIGHT_KNEE].x, landmarks[self.mp_pose.PoseLandmark.RIGHT_KNEE].y]
        l_ankle = [landmarks[self.mp_pose.PoseLandmark.LEFT_ANKLE].x, landmarks[self.mp_pose.PoseLandmark.LEFT_ANKLE].y]
        r_ankle = [landmarks[self.mp_pose.PoseLandmark.RIGHT_ANKLE].x, landmarks[self.mp_pose.PoseLandmark.RIGHT_ANKLE].y]
        l_shoulder = [landmarks[self.mp_pose.PoseLandmark.LEFT_SHOULDER].x, landmarks[self.mp_pose.PoseLandmark.LEFT_SHOULDER].y]
        r_shoulder = [landmarks[self.mp_pose.PoseLandmark.RIGHT_SHOULDER].x, landmarks[self.mp_pose.PoseLandmark.RIGHT_SHOULDER].y]
        l_elbow = [landmarks[self.mp_pose.PoseLandmark.LEFT_ELBOW].x, landmarks[self.mp_pose.PoseLandmark.LEFT_ELBOW].y]
        r_elbow = [landmarks[self.mp_pose.PoseLandmark.RIGHT_ELBOW].x, landmarks[self.mp_pose.PoseLandmark.RIGHT_ELBOW].y]
        l_wrist = [landmarks[self.mp_pose.PoseLandmark.LEFT_WRIST].x, landmarks[self.mp_pose.PoseLandmark.LEFT_WRIST].y]
        r_wrist = [landmarks[self.mp_pose.PoseLandmark.RIGHT_WRIST].x, landmarks[self.mp_pose.PoseLandmark.RIGHT_WRIST].y]

        left_knee_angle = self.calculate_angle(l_hip, l_knee, l_ankle)
        right_knee_angle = self.calculate_angle(r_hip, r_knee, r_ankle)
        
        if left_knee_angle < right_knee_angle:
            front_hip, front_knee, front_ankle = l_hip, l_knee, l_ankle
            back_hip, back_knee, back_ankle = r_hip, r_knee, r_ankle
            front_knee_angle = left_knee_angle
            back_leg_angle = right_knee_angle
            hip_angle = self.calculate_angle(l_hip, r_hip, [r_hip[0] + 1, r_hip[1]])
        else:
            front_hip, front_knee, front_ankle = r_hip, r_knee, r_ankle
            back_hip, back_knee, back_ankle = l_hip, l_knee, l_ankle
            front_knee_angle = right_knee_angle
            back_leg_angle = left_knee_angle
            hip_angle = self.calculate_angle(r_hip, l_hip, [l_hip[0] - 1, l_hip[1]])

        torso_angle = self.calculate_angle(
            [(l_hip[0] + r_hip[0]) / 2, (l_hip[1] + r_hip[1]) / 2],
            [(l_shoulder[0] + r_shoulder[0]) / 2, (l_shoulder[1] + r_shoulder[1]) / 2],
            [0, 1]
        )
        #l_arm_angle = self.calculate_angle(l_shoulder, l_elbow, l_wrist)
        #r_arm_angle = self.calculate_angle(r_shoulder, r_elbow, r_wrist)
        shoulder_hip_angle = self.calculate_angle(l_shoulder, r_shoulder, r_hip)

        if not self.THRESHOLDS["front_knee_angle"][0] <= front_knee_angle <= self.THRESHOLDS["front_knee_angle"][1]:
            errors.append("Bend your front knee more." if front_knee_angle > 100 else "Straighten your front knee slightly.")
        if not self.THRESHOLDS["back_leg_angle"][0] <= back_leg_angle <= self.THRESHOLDS["back_leg_angle"][1]:
            errors.append("Straighten your back leg." if back_leg_angle < 160 else "Relax your back leg slightly.")
        
        if not self.THRESHOLDS["hip_orientation"][0] <= hip_angle <= self.THRESHOLDS["hip_orientation"][1]:
            if front_hip == r_hip:
                if r_hip[1] > l_hip[1]:
                    errors.append("Level your hips; right hip is too high.")
                else:
                    errors.append("Level your hips; left hip is too high.")
            else:
                if l_hip[1] > r_hip[1]:
                    errors.append("Level your hips; left hip is too high.")
                else:
                    errors.append("Level your hips; right hip is too high.")

        #if not self.THRESHOLDS["arm_angle"][0] <= l_arm_angle <= self.THRESHOLDS["arm_angle"][1] or \
        #   not self.THRESHOLDS["arm_angle"][0] <= r_arm_angle <= self.THRESHOLDS["arm_angle"][1]:
        #    errors.append("Raise your arms to shoulder level." if l_arm_angle < 170 or r_arm_angle < 170 else "Extend your arms fully.")

        l_arm_angle = self.calculate_angle(r_shoulder, l_shoulder, l_wrist)
        r_arm_angle = self.calculate_angle(l_shoulder, r_shoulder, r_wrist)
        if not self.THRESHOLDS["arm_angle"][0] <= l_arm_angle <= self.THRESHOLDS["arm_angle"][1] or \
           not self.THRESHOLDS["arm_angle"][0] <= r_arm_angle <= self.THRESHOLDS["arm_angle"][1]:
            errors.append("Raise your arms to shoulder level.")

        return errors[:3]

    def reset_counters(self):
        """Reset frame counts and report metrics for a new session."""
        self.frame_count = 0
        self.recording = False
        self.report = {
            "good_form_frames": 0,
            "error_counts": defaultdict(int)
        }
        print("Warrior pose analyzer counters reset")

    def generate_report(self):
        """Generate and return an exercise report."""
        total_recorded_frames = self.record_frames
        good_form_seconds = self.report["good_form_frames"] / self.fps
        total_seconds = total_recorded_frames / self.fps

        report_text = "\n--- Warrior II Exercise Report ---\n"
        report_text += f"Total Recorded Time: {total_seconds:.2f} seconds\n"
        report_text += f"Good Form Duration: {good_form_seconds:.2f} seconds ({(good_form_seconds / total_seconds) * 100:.1f}%)\n"
        report_text += "Errors Detected:\n"
        if self.report["error_counts"]:
            for error, count in self.report["error_counts"].items():
                error_seconds = count / self.fps
                report_text += f"  - '{error}': {count} frames ({error_seconds:.2f} seconds, {(count / total_recorded_frames) * 100:.1f}%)\n"
        else:
            report_text += "  - No errors detected!\n"
        report_text += "--------------------------------\n"
        
        # Print the report too
        print(report_text)
        
        return report_text
    async def process_video(self, frame):
        """Process a single frame and return data to broadcast."""
        # Process the frame with MediaPipe Pose
        results = self.pose.process(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        annotated_frame = frame.copy()  # Create a copy to annotate
        error_text = ""
        if results.pose_landmarks:
            self.mp_drawing.draw_landmarks(annotated_frame, results.pose_landmarks, self.mp_pose.POSE_CONNECTIONS)
            errors = self.check_warrior_pose(results.pose_landmarks.landmark)

            # Update frame count and recording logic
            self.frame_count += 1
            if self.frame_count > self.delay_frames and not self.recording:
                self.recording = True
                self.start_frame = self.frame_count
            if self.recording and (self.frame_count - self.start_frame): # <= self.record_frames: ### REMOVED BECAUSE THIS WAS FOR TESTING
                if not errors:
                    self.report["good_form_frames"] += 1
                for error in errors:
                    if error not in self.report["error_counts"]:
                        self.report["error_counts"][error] = 0
                    self.report["error_counts"][error] += 1

            # Display errors or "Correct Form" on the frame
            if errors:
                for i, error in enumerate(errors):
                    cv2.putText(annotated_frame, error, (10, 30 + i * 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
            else:
                cv2.putText(annotated_frame, "Correct Form", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
            
            ### TEXT TO SPEECH PORTION
            ### TEXT TO SPEECH PORTION
            if errors:
                error_text = errors[0]
                if len(errors) > 1:
                    error_text += " " + errors[1]
            else:
                error_text = "You are doing well."



        



        # Encode frame as base64 and return data
        frame_base64 = self._encode_frame(annotated_frame)
        return {
            "type": "frame",
            "data": frame_base64,
            "good_form_frames": self.report["good_form_frames"],
            "error_counts": self.report["error_counts"],
            "recording": self.recording,
            "frame_count": self.frame_count - self.start_frame if self.recording else 0,
            "error_text": error_text                ## ADDED FOR TTS
        }

    def _encode_frame(self, frame):
        """Encode frame as base64."""
        _, buffer = cv2.imencode('.jpg', frame)
        return base64.b64encode(buffer).decode('utf-8')

    def __del__(self):
        self.pose.close()
