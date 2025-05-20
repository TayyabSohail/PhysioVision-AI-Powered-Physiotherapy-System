import cv2
import mediapipe as mp
import numpy as np
from collections import defaultdict
import logging
import base64
# import asyncio

logger = logging.getLogger(__name__)
class LungesAnalyzer:
    def __init__(self, exercise="Lunges", delay_seconds=3, target_reps=8, fps=30):
        # --- MediaPipe Pose Setup ---
        self.mp_pose = mp.solutions.pose
        self.pose = self.mp_pose.Pose(
            static_image_mode=False,
            model_complexity=2,
            min_detection_confidence=0.7,
            min_tracking_confidence=0.7
        )
        self.mp_drawing = mp.solutions.drawing_utils

        # --- Exercise Settings ---
        self.exercise = exercise
        self.fps = fps
        self.delay_frames = delay_seconds * fps
        self.target_reps = target_reps
        self.frame_count = 0
        self.recording = False
        self.report = {
            "good_form_frames": 0,
            "error_counts": defaultdict(int)
        }

        # --- Thresholds for Lunges ---
        self.LUNGE_THRESHOLDS = {
            "knee_angle": (80, 100),
            "back_knee_angle": (75, 115),
            "torso_uprightness": (70, 110),
            "stance_width": (0.2, 0.6),
            "hip_level": (0, 0.15),
        }

        # --- Rep Counting Variables ---
        self.reps = 0
        self.in_lunge_position = False
        self.lunge_depth_threshold = 0.05
        self.prev_knee_angle = None
        self.start_frame = 0
        self.max_knee_bend = 180
        self.shallow_rep_detected = False
        self.knee_angles_history = []
        self.direction = None
        self.phase_frames = 0

        # --- ML Model Setup ---
        self.scaler = None
        self.pca = None
        self.model = None
        self.is_trained = False

        # --- Landmarks to Extract for Model ---
        self.target_landmarks = [
            'LEFT_HIP', 'LEFT_KNEE', 'LEFT_ANKLE',
            'RIGHT_HIP', 'RIGHT_KNEE', 'RIGHT_ANKLE'
        ]
        
    def extract_keypoints(self, frame):
        """Extract hip, knee, and ankle keypoints from a single frame."""
        # Convert BGR to RGB
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Process the frame
        results = self.pose.process(frame_rgb)
        
        if not results.pose_landmarks:
            return None, None
        
        # Extract only hip, knee, ankle keypoints
        keypoints = []
        landmark_dict = {}
        
        for i, landmark in enumerate(results.pose_landmarks.landmark):
            name = self.mp_pose.PoseLandmark(i).name
            if name in self.target_landmarks:
                landmark_dict[name] = [landmark.x, landmark.y, landmark.z]
        
        # Determine leading leg
        knee_r = landmark_dict['RIGHT_KNEE'][:2]  # Just x,y for position comparison
        knee_l = landmark_dict['LEFT_KNEE'][:2]
        
        # Lower y-value means higher in the image (closer to top of frame)
        if knee_r[1] < knee_l[1]:  # Right knee is higher in the frame
            leading_leg = "Right"  # Right leg is forward
        else:
            leading_leg = "Left"  # Left leg is forward
            
        # Extract features in a consistent order
        for name in self.target_landmarks:
            keypoints.extend(landmark_dict[name])
            
        return np.array(keypoints), leading_leg
    
    def normalize_side(self, keypoints, leading_leg):
        """
        Normalize left/right sides to treat them as the same movement pattern.
        This maps all lunges to a standardized form regardless of which leg is forward.
        """
        # Reshape keypoints to have landmarks as rows with [x,y,z] columns
        # We have 6 landmarks (L/R hip, knee, ankle) with 3 coordinates each
        landmarks = keypoints.reshape(6, 3)
        
        # Standardize to always have the same leg configuration
        # If right leg is forward but we want left leg to be our standard (or vice versa)
        if leading_leg == "Right":
            # Swap left and right sides
            temp = np.copy(landmarks[0:3])
            landmarks[0:3] = landmarks[3:6]
            landmarks[3:6] = temp
        
        # Return flattened normalized keypoints
        return landmarks.flatten()
    
    def calculate_lunge_features(self, keypoints, original_leading_leg):
        """Calculate important angles and distances for lunge form assessment."""
        # Reshape keypoints to have landmarks as rows with [x,y,z] columns
        landmarks = keypoints.reshape(6, 3)
        
        # Extract individual landmarks
        front_hip = landmarks[0]    # Using left as front leg (after normalization)
        front_knee = landmarks[1]
        front_ankle = landmarks[2]
        
        # Calculate angle between three points
        def calculate_angle(a, b, c):
            a = np.array(a)
            b = np.array(b)
            c = np.array(c)
            
            ba = a - b
            bc = c - b
            
            cosine_angle = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc))
            # Clip to avoid numerical errors
            cosine_angle = np.clip(cosine_angle, -1.0, 1.0)
            angle = np.arccos(cosine_angle)
            return np.degrees(angle)
        
        # Calculate relevant angles and distances
        features = {}
        
        # Front leg angles
        features['front_knee_angle'] = calculate_angle(front_hip, front_knee, front_ankle)
        
        # Store the original leading leg for reference
        features['leading_leg'] = original_leading_leg
        
        return features
    
    def load_model(self, model_path):
        try:
            print("Attempting to load model...")
            with open(model_path, 'rb') as f:
                model_data = pickle.load(f)
                self.scaler = model_data['scaler']
                self.pca = model_data['pca']
                self.model = model_data['model']
                self.feature_means = model_data['feature_means']
                self.feature_stds = model_data['feature_stds']
            self.is_trained = True
            print("Model loaded successfully!")
        except Exception as e:
            print(f"Error loading model: {e}")



    def reset_counters(self):
        """Reset counters and data storage."""
        self.frame_count = 0
        self.frames_keypoints = []
        self.features_data = []

    async def process_video(self, frame):
        """Process a single frame and return data to broadcast."""
        if not self.is_trained:
            logger.error("Model not trained. Please train or load a model first.")
            return {"type": "error", "message": "Model not trained"}

        self.frame_count += 1
        annotated_frame = frame.copy()

        # Process the frame
        is_correct, feedback, features, errors = self.detect_form(annotated_frame)

        # Draw the pose on the frame
        frame_rgb = cv2.cvtColor(annotated_frame, cv2.COLOR_BGR2RGB)
        results = self.pose.process(frame_rgb)
        annotated_frame = cv2.cvtColor(frame_rgb, cv2.COLOR_RGB2BGR)

        if results.pose_landmarks:
            # Extract landmarks and leading leg information
            leading_leg = features.get('leading_leg', 'Unknown') if features else 'Unknown'

            # Custom drawing to highlight only hips, knees, ankles
            landmarks = results.pose_landmarks

            
            # Highlight the leading leg with a different color
            left_color = (0, 255, 0) if leading_leg == "Left" else (255, 0, 0)  # Green for leading, blue for back
            right_color = (0, 255, 0) if leading_leg == "Right" else (255, 0, 0)

            # Draw only the landmarks we care about
            landmark_ids = [
                (self.mp_pose.PoseLandmark.LEFT_HIP, left_color),
                (self.mp_pose.PoseLandmark.LEFT_KNEE, left_color),
                (self.mp_pose.PoseLandmark.LEFT_ANKLE, left_color),
                (self.mp_pose.PoseLandmark.RIGHT_HIP, right_color),
                (self.mp_pose.PoseLandmark.RIGHT_KNEE, right_color),
                (self.mp_pose.PoseLandmark.RIGHT_ANKLE, right_color)
            ]

            for landmark_id, color in landmark_ids:
                landmark = landmarks.landmark[landmark_id]
                h, w, c = annotated_frame.shape
                cx, cy = int(landmark.x * w), int(landmark.y * h)
                cv2.circle(annotated_frame, (cx, cy), 10, color, -1)

            # Draw connections with correct colors
            for connection in [
                (self.mp_pose.PoseLandmark.LEFT_HIP, self.mp_pose.PoseLandmark.LEFT_KNEE, left_color),
                (self.mp_pose.PoseLandmark.LEFT_KNEE, self.mp_pose.PoseLandmark.LEFT_ANKLE, left_color),
                (self.mp_pose.PoseLandmark.RIGHT_HIP, self.mp_pose.PoseLandmark.RIGHT_KNEE, right_color),
                (self.mp_pose.PoseLandmark.RIGHT_KNEE, self.mp_pose.PoseLandmark.RIGHT_ANKLE, right_color),
            ]:
                start_idx = connection[0].value
                end_idx = connection[1].value
                connection_color = connection[2]

                start = landmarks.landmark[start_idx]
                end = landmarks.landmark[end_idx]

                h, w, c = annotated_frame.shape
                start_point = (int(start.x * w), int(start.y * h))
                end_point = (int(end.x * w), int(end.y * h))

                cv2.line(annotated_frame, start_point, end_point, connection_color, 3)

        # Display leading leg information
        if features and 'leading_leg' in features:
            cv2.putText(annotated_frame, f"Leading Leg: {features['leading_leg']}", 
                        (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)

        # Display feedback
        color = (0, 255, 0) if is_correct else (0, 0, 255)
        cv2.putText(annotated_frame, feedback, (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)

        # Display errors with visual indicators
        if errors:
            y_pos = 90
            for feature_name, error_info in errors.items():
                message = error_info["message"]
                cv2.putText(annotated_frame, message, (10, y_pos), 
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
                y_pos += 30
                # Log errors for report
                if message not in self.errors_log:
                    self.errors_log[message] = 0
                self.errors_log[message] += 1

        # Display features if available
        if features:
            h, w, c = annotated_frame.shape
            y_pos = h - 150  # Start from bottom of frame
            for feature_name, feature_value in features.items():
                if feature_name == 'leading_leg':
                    continue
                if isinstance(feature_value, (int, float)):
                    value_str = f"{feature_value:.1f}"
                else:
                    value_str = str(feature_value)
                cv2.putText(annotated_frame, f"{feature_name}: {value_str}", (10, y_pos), 
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
                y_pos += 20

        # Track correct frames
        correct_return = "Incorrect"
        if is_correct:
            self.correct_frames += 1
            correct_return = "Correct"

        # Encode frame as base64 and return data
        frame_base64 = self._encode_frame(annotated_frame)
        return {
            "type": "frame",
            "data": frame_base64,
            "is_correct": correct_return,
            "feedback": feedback,
            "errors": errors,
        }

    def _encode_frame(self, frame):
        """Encode frame as base64."""
        _, buffer = cv2.imencode('.jpg', frame)
        return base64.b64encode(buffer).decode('utf-8')

    def generate_report(self):
        """Generate and return an exercise report."""
        report = "\n--- Lunges Exercise Report ---\n"
        report += f"Total Frames Processed: {self.frame_count}\n"
        report += f"Frames with Keypoints Detected: {len(self.frames_keypoints)}\n"
        if self.features_data:
            report += "Feature Summary (example):\n"
            # Add summary stats if desired, e.g., average depth or knee angle
            for i, features in enumerate(self.features_data[:5]):  # Limit to first 5 for brevity
                report += f"  - Frame {i+1}: {features}\n"
            if len(self.features_data) > 5:
                report += f"  - ...and {len(self.features_data) - 5} more frames\n"
        else:
            report += "No features calculated (no keypoints detected).\n"
        report += "--------------------------------\n"
        return report
    
    def detect_form(self, frame):
        """Detect lunge form in a single frame with detailed feedback."""
        if not self.is_trained:
            raise ValueError("Model not trained. Please train or load a model first.")
        
        keypoints, leading_leg = self.extract_keypoints(frame)
        if keypoints is None:
            return False, "No person detected", None, None

        # Normalize and prepare features
        normalized_keypoints = self.normalize_side(keypoints, leading_leg)
        features = self.calculate_lunge_features(normalized_keypoints, leading_leg)
        keypoints_scaled = self.scaler.transform(normalized_keypoints.reshape(1, -1))
        keypoints_pca = self.pca.transform(keypoints_scaled)
        
        prediction = self.model.predict(keypoints_pca)[0]
        score = self.model.score_samples(keypoints_pca)[0]
        is_correct = prediction == 1

        # ---- Feedback logic using merged check_lunges_form features ----
        errors = {}
        feedback = ""

        front_knee_angle = features.get("front_knee_angle", 180)
        back_knee_angle = features.get("back_knee_angle", 180)
        torso_angle = features.get("torso_angle", 0)
        stance_width = features.get("stance_width", 0)
        hip_level_diff = features.get("hip_level_diff", 0)
        knee_past_toe = features.get("knee_past_toe", False)

        min_knee, max_knee = self.LUNGE_THRESHOLDS["knee_angle"]
        if front_knee_angle > max_knee:
            msg = "Bend front knee more"
            feedback += msg + ". "
            errors["front_knee_angle"] = {"message": msg, "value": front_knee_angle, "ideal": (min_knee + max_knee) / 2}
        elif front_knee_angle < min_knee:
            msg = "Front knee bent too much"
            feedback += msg + ". "
            errors["front_knee_angle"] = {"message": msg, "value": front_knee_angle, "ideal": (min_knee + max_knee) / 2}

        if knee_past_toe:
            msg = "Front knee past toes"
            feedback += msg + ". "
            errors["knee_over_toe"] = {"message": msg}

        min_back, max_back = self.LUNGE_THRESHOLDS["back_knee_angle"]
        if back_knee_angle > max_back:
            msg = "Bend back knee more"
            feedback += msg + ". "
            errors["back_knee_angle"] = {"message": msg, "value": back_knee_angle, "ideal": (min_back + max_back) / 2}
        elif back_knee_angle < min_back:
            msg = "Back knee bent too much"
            feedback += msg + ". "
            errors["back_knee_angle"] = {"message": msg, "value": back_knee_angle, "ideal": (min_back + max_back) / 2}

        min_torso, max_torso = self.LUNGE_THRESHOLDS["torso_uprightness"]
        if torso_angle < min_torso or torso_angle > max_torso:
            msg = "Keep torso upright"
            feedback += msg + ". "
            errors["torso_angle"] = {"message": msg, "value": torso_angle, "ideal": (min_torso + max_torso) / 2}

        _, max_hip_diff = self.LUNGE_THRESHOLDS["hip_level"]
        if hip_level_diff > max_hip_diff:
            msg = "Keep hips level"
            feedback += msg + ". "
            errors["hip_level_diff"] = {"message": msg, "value": hip_level_diff, "ideal": 0}

        min_stance, max_stance = self.LUNGE_THRESHOLDS["stance_width"]
        if stance_width < min_stance:
            msg = "Increase stance width"
            feedback += msg + ". "
            errors["stance_width"] = {"message": msg, "value": stance_width, "ideal": (min_stance + max_stance) / 2}
        elif stance_width > max_stance:
            msg = "Reduce stance width"
            feedback += msg + ". "
            errors["stance_width"] = {"message": msg, "value": stance_width, "ideal": (min_stance + max_stance) / 2}

        # Final feedback result
        if is_correct:
            return True, "Good form!", features, {}
        else:
            if not feedback:
                feedback = "Form needs improvement. Check your posture."
            return False, feedback.strip(), features, errors

    

    