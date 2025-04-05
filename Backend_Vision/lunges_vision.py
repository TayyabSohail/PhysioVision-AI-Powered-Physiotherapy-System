import cv2
import mediapipe as mp
import numpy as np
import pickle
import logging
import base64

logger = logging.getLogger(__name__)


class LungesAnalyzer:
    def __init__(self):
        # Initialize MediaPipe Pose
        self.mp_pose = mp.solutions.pose
        self.pose = self.mp_pose.Pose(
            static_image_mode=False,
            model_complexity=2,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        self.mp_drawing = mp.solutions.drawing_utils
        
        # Initialize model components
        self.scaler = None
        self.pca = None
        self.model = None
        self.is_trained = False
        
        # Define the landmarks we're interested in (hip, knee, ankle only)
        self.target_landmarks = [
            'LEFT_HIP', 'LEFT_KNEE', 'LEFT_ANKLE',
            'RIGHT_HIP', 'RIGHT_KNEE', 'RIGHT_ANKLE'
        ]

        # Initialize counters
        self.frame_count = 0
        self.frames_keypoints = []
        self.features_data = []
        self.correct_frames = 0
        self.errors_log = {}
        
        # Load the lunge model
        self.load_model(r"E:\IMPORTED FROM C\Desktop\Website_PhysioVision\PhysioVision\Backend_Vision\models_vision\lunge_model.pkl")

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
            print(f"Attempting to load model from: {model_path}")
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
            logger.error(f"Error loading model: {e}")
            print(f"Error loading model: {e}")
            self.is_trained = False

    def reset_counters(self):
        """Reset counters and data storage."""
        self.frame_count = 0
        self.frames_keypoints = []
        self.features_data = []
        self.correct_frames = 0
        self.errors_log = {}

    async def process_video(self, frame):
        """Process a single frame and return data to broadcast."""
        # Check if model is loaded
        if not self.is_trained:
            logger.error("Model not trained. Please train or load a model first.")
            return {"type": "error", "message": "Model not trained. Please load the model first."}

        self.frame_count += 1
        annotated_frame = frame.copy()

        # Process the frame
        try:
            is_correct, feedback, features, errors = self.detect_form(annotated_frame)

            # Convert NumPy bool_ to Python bool for JSON serialization
            if isinstance(is_correct, np.bool_):
                is_correct = bool(is_correct)

        except Exception as e:
            logger.error(f"Error in detect_form: {e}")
            return {"type": "error", "message": f"Error processing frame: {str(e)}"}

        # Encode frame as base64 before returning
        frame_base64 = self._encode_frame(annotated_frame)

        # Ensure numpy types are converted to Python native types
        if features:
            for key, value in features.items():
                if isinstance(value, np.number):
                    features[key] = value.item()  # Convert numpy numbers to Python native types

        return {
            "type": "frame",
            "data": frame_base64,
            "is_correct": is_correct,
            "feedback": feedback,
            "features": features,
            "errors": errors,
            "frame_count": self.frame_count
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
        
        if self.frame_count > 0:
            report += f"Correct Form Frames: {self.correct_frames}\n"
            report += f"Accuracy Rate: {(self.correct_frames / self.frame_count * 100):.1f}% correct\n"
        
        if self.errors_log:
            report += "\nCommon Issues:\n"
            for error_message, count in sorted(self.errors_log.items(), key=lambda x: x[1], reverse=True):
                percentage = (count / self.frame_count) * 100
                report += f"  - {error_message}: {count} frames ({percentage:.1f}%)\n"
                
        if self.features_data:
            report += "\nFeature Summary:\n"
            # Calculate average front knee angle
            knee_angles = [f.get('front_knee_angle', 0) for f in self.features_data if 'front_knee_angle' in f]
            if knee_angles:
                avg_knee_angle = sum(knee_angles) / len(knee_angles)
                report += f"  - Average Front Knee Angle: {avg_knee_angle:.1f} degrees\n"
            
            # Count leading leg statistics
            leading_legs = [f.get('leading_leg', 'Unknown') for f in self.features_data if 'leading_leg' in f]
            if leading_legs:
                left_count = leading_legs.count('Left')
                right_count = leading_legs.count('Right')
                total = len(leading_legs)
                if total > 0:
                    report += f"  - Leading Leg Distribution: Left: {left_count} ({left_count/total*100:.1f}%), Right: {right_count} ({right_count/total*100:.1f}%)\n"
        else:
            report += "No features calculated (no keypoints detected).\n"
            
        report += "\nRecommendations:\n"
        if self.errors_log:
            top_error = max(self.errors_log.items(), key=lambda x: x[1])[0]
            report += f"  - Focus on correcting: {top_error}\n"
        else:
            report += "  - Great job! Keep maintaining good form.\n"
            
        report += "--------------------------------\n"
        return report
    
    def detect_form(self, frame):
        """Detect lunge form in a single frame."""
        if not self.is_trained:
            raise ValueError("Model not trained. Please train or load a model first.")
        
        keypoints, leading_leg = self.extract_keypoints(frame)
        if keypoints is None:
            return False, "No person detected", None, None
        
        # Normalize based on which leg is leading
        normalized_keypoints = self.normalize_side(keypoints, leading_leg)
        
        # Calculate features for specific feedback
        features = self.calculate_lunge_features(normalized_keypoints, leading_leg)
        
        # Prepare keypoints for prediction
        keypoints_scaled = self.scaler.transform(normalized_keypoints.reshape(1, -1))
        keypoints_pca = self.pca.transform(keypoints_scaled)
        
        # Make prediction
        prediction = self.model.predict(keypoints_pca)[0]
        if isinstance(prediction, np.number):
            prediction = prediction.item()  # Convert numpy number to Python native type
        score = self.model.score_samples(keypoints_pca)[0]
        if isinstance(score, np.number):
            score = score.item()  # Convert numpy number to Python native type
        
        # Check if form is correct
        is_correct = bool(prediction == 1)
        
        # Prepare feedback
        feedback = ""
        errors = {}
        
        if not is_correct:
            for feature_name, feature_value in features.items():
                if feature_name == 'leading_leg':
                    continue
                    
                if "front_knee_angle" in feature_name:
                    if feature_value < 70:
                        message = f"{leading_leg} leg: Bend your knee more."
                        errors[feature_name] = {"message": message, "value": feature_value, "ideal": 90}
                        feedback += message + " "
                    elif feature_value > 110:
                        message = f"{leading_leg} leg: Don't bend your knee too much."
                        errors[feature_name] = {"message": message, "value": feature_value, "ideal": 90}
                        feedback += message + " "

            if not feedback:
                feedback = "Form needs improvement. Check your overall posture."
        else:
            feedback = "Good form!"
        
        return is_correct, feedback, features, errors