import cv2
import asyncio
import json
import logging
import threading
import time
import websockets
from functools import partial
from squats import SquatAnalyzer  # Import SquatAnalyzer
from WarriorPose  import WarriorPoseAnalyzer
from lunges_vision import LungesAnalyzer
from legRaises import SLRExerciseAnalyzer 
# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class VideoServer:
    def __init__(self):
        self.cap = None
        self.clients = set()
        self.event_loop = None
        self.server = None
        self.running = False
        self.current_analyzer = None

        # Initialize analyzers with SquatAnalyzer
        self.analyzers = {
            "Squats": SquatAnalyzer(),  # Pass an instance of SquatAnalyzer
            "Warrior": WarriorPoseAnalyzer(),  # Add WarriorPoseAnalyzer
            "Lunges": LungesAnalyzer(),
            "LegRaises": SLRExerciseAnalyzer()
        }

    async def process_frames(self, input_source=0):
        """Centralized frame processing loop."""
        self.cap = cv2.VideoCapture(input_source)
        if not self.cap.isOpened():
            logger.error(f"Error: Could not open video source {input_source}")
            return

        try:
            while self.running and self.cap.isOpened():
                start_time = time.time()

                success, frame = self.cap.read()
                if not success:
                    logger.info("End of video")
                    break

                # Process frame with the current analyzer if selected
                if self.current_analyzer:
                    processed_data = await self.current_analyzer.process_video(frame)
                    if processed_data:
                        await self._broadcast(processed_data)

                # Maintain ~30 FPS
                processing_time = time.time() - start_time
                await asyncio.sleep(max(0, 0.03 - processing_time))

        except Exception as e:
            logger.error(f"Error during frame processing: {e}")
        finally:
            if self.cap:
                self.cap.release()
            if self.current_analyzer:
                try:
                    report = self.current_analyzer.generate_report()
                    if report is not None:  # Check if report is not None
                        print("\n" + report)
                        with open('report.txt', 'w') as f:
                            f.write(report)
                    else:
                        logger.warning("No report was generated (returned None)")
                        print("\nNo report was generated.")
                except Exception as e:
                    logger.error(f"Error generating report: {e}")
            logger.info("Video processing stopped")
            
    async def _broadcast(self, message):
        """Broadcast a message to all connected clients."""
        if not self.clients:
            return
        message_json = json.dumps(message)
        await asyncio.gather(
            *[client.send(message_json) for client in self.clients],
            return_exceptions=True
        )

    def broadcast_message(self, message):
        """Broadcast a message to all connected clients from any thread."""
        if self.event_loop and self.clients:
            asyncio.run_coroutine_threadsafe(self._broadcast(message), self.event_loop)

    async def websocket_handler(self, websocket):
        """Handle incoming WebSocket connections."""
        self.clients.add(websocket)
        logger.info(f"New client connected: {websocket.remote_address}")
        try:
            async for message in websocket:
                try:
                    data = json.loads(message)
                    action = data.get('action')
                    exercise = data.get('exercise')
                    logger.info(f"Received action: {action}, exercise: {exercise}")

                    if action == 'connect':
                        await websocket.send(json.dumps({"status": "connected"}))
                    elif action == 'start':
                        if exercise in self.analyzers:
                            if not self.running:
                                self.current_analyzer = self.analyzers[exercise]
                                self.current_analyzer.reset_counters()  # Reset counters for new exercise
                                self.running = True
                                asyncio.create_task(self.process_frames())
                                await websocket.send(json.dumps({"status": "started", "exercise": exercise}))
                            else:
                                await websocket.send(json.dumps({"status": "already_running"}))
                        else:
                            await websocket.send(json.dumps({"error": "Invalid exercise"}))
                    elif action == 'stop':
                        if self.running:
                            self.running = False
                            await websocket.send(json.dumps({"status": "stopped"}))
                        else:
                            await websocket.send(json.dumps({"status": "not_running"}))
                    else:
                        logger.warning(f"Unknown action: {action}")
                        await websocket.send(json.dumps({"error": "Unknown action"}))
                except json.JSONDecodeError:
                    logger.error("Invalid JSON received")
                    await websocket.send(json.dumps({"error": "Invalid request format"}))
        except websockets.ConnectionClosed:
            logger.info(f"Client disconnected: {websocket.remote_address}")
        finally:
            self.clients.remove(websocket)

    def start_server(self, host='localhost', port=8765):
        """Start the WebSocket server."""
        def run_event_loop(loop):
            asyncio.set_event_loop(loop)
            loop.run_forever()

        self.event_loop = asyncio.new_event_loop()
        server_thread = threading.Thread(
            target=run_event_loop,
            args=(self.event_loop,),
            daemon=True
        )
        server_thread.start()

        asyncio.run_coroutine_threadsafe(self._start_websocket_server(host, port), self.event_loop)
        logger.info(f"WebSocket server started on ws://{host}:{port}")

    async def _start_websocket_server(self, host, port):
        """Start the WebSocket server asynchronously."""
        self.server = await websockets.serve(
            self.websocket_handler,  # FIX: Directly pass the function
            host,
            port,
            ping_interval=30
        )

    def stop_server(self):
        """Stop the WebSocket server."""
        self.running = False
        if self.server:
            self.server.close()
            asyncio.run_coroutine_threadsafe(self.server.wait_closed(), self.event_loop)
            self.event_loop.call_soon_threadsafe(self.event_loop.stop)
            logger.info("WebSocket server stopped")

if __name__ == "__main__":
    server = VideoServer()
    server.start_server()
    try:
        while True:
            time.sleep(1)  # Keep main thread alive
    except KeyboardInterrupt:
        server.stop_server()
