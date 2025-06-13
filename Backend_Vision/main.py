import cv2
import asyncio
import json
import logging
import threading
import time
import websockets
from functools import partial
from squats import SquatAnalyzer  # Import SquatAnalyzer
from WarriorPose import WarriorPoseAnalyzer
from lunges_vision import LungesAnalyzer
from legRaises import SLRExerciseAnalyzer 
from bark_tts import play_speech_directly


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
        self.frame_processing_task = None

        self.language=""
        self.audiobot = ""

        # Initialize analyzers with SquatAnalyzer
        self.analyzers = {
            "Squats": SquatAnalyzer(),  
            "Warrior": WarriorPoseAnalyzer(),  
            "Lunges": LungesAnalyzer(),
            "LegRaises": SLRExerciseAnalyzer()
        }

    async def process_frames(self, input_source=0):
        """Centralized frame processing loop with TTS error reporting."""
        try:
            self.cap = cv2.VideoCapture(input_source)
            if not self.cap.isOpened():
                logger.error(f"Error: Could not open video source {input_source}")
                await self._broadcast({"error": "Could not open video source"})
                return

            # TTS-related state variables
            self.last_error_text = None
            self.error_hold_start_time = None
            self.last_tts_time = 0
            self.tts_repeat_interval = 5.0
            self.error_tts_cooldown = 2.0

            logger.info("Started processing frames")
            while self.running and self.cap.isOpened():
                start_time = time.time()

                success, frame = self.cap.read()
                if not success:
                    logger.info("End of video or camera disconnected")
                    await self._broadcast({"error": "Video source disconnected"})
                    break

                if self.current_analyzer:
                    try:
                        processed_data = await self.current_analyzer.process_video(frame)

                        if processed_data:
                            # --- TTS Error Monitoring Logic ---
                            error_text = processed_data.get("error_text", "") or ""
                            if error_text:
                                error_text = error_text.strip()
                            current_time = time.time()

                            if error_text:
                                if error_text != self.last_error_text:
                                    self.last_error_text = error_text
                                    self.error_hold_start_time = current_time
                                    self.last_tts_time = 0
                                
                                time_held = current_time - self.error_hold_start_time
                                time_since_last_tts = current_time - self.last_tts_time
                                
                                if (time_held >= self.error_tts_cooldown and 
                                    (self.last_tts_time == 0 or 
                                    time_since_last_tts >= self.tts_repeat_interval)):
                                    
                                    if self.audiobot != "off":
                                        # Generate audio and send to frontend
                                        tts_result = await play_speech_directly(error_text, self.language)
                                        if tts_result["audio_data"]:
                                            await self._broadcast({
                                                "type": "audio",
                                                "audio_data": tts_result["audio_data"]
                                            })
                                            self.last_tts_time = current_time
                                        if tts_result["error"]:
                                            logger.error(tts_result["error"])

                            else:
                                self.last_error_text = None
                                self.error_hold_start_time = None
                                self.last_tts_time = 0

                            await self._broadcast(processed_data)

                    except Exception as e:
                        logger.error(f"Error processing frame: {e}")
                        await self._broadcast({"error": f"Frame processing error: {str(e)}"})

                processing_time = time.time() - start_time
                await asyncio.sleep(max(0, 0.033 - processing_time))

        except Exception as e:
            logger.error(f"Error during frame processing: {e}")
            await self._broadcast({"error": f"Frame processing error: {str(e)}"})
        finally:
            if self.cap:
                self.cap.release()
                self.cap = None

            if self.current_analyzer:
                try:
                    report = self.current_analyzer.generate_report()
                    if report is not None:
                        print("\n" + report)
                        with open('report.txt', 'w') as f:
                            f.write(report)
                        await self._broadcast({"type": "report", "data": report})
                    else:
                        logger.warning("No report was generated (returned None)")
                except Exception as e:
                    logger.error(f"Error generating report: {e}")

            logger.info("Video processing stopped")
            await self._broadcast({"status": "stopped"})

    def set_language(self, language_code: str):
        """Set the language for TTS playback."""
        supported_languages = ["en", "ur"]
        if language_code in supported_languages:
            self.language = language_code
            logger.info(f"TTS language set to {language_code}")
        else:
            logger.warning(f"Unsupported language: {language_code}")


    # async def process_frames(self, input_source=0):
    #     """Centralized frame processing loop."""
    #     try:
    #         self.cap = cv2.VideoCapture(input_source)
    #         if not self.cap.isOpened():
    #             logger.error(f"Error: Could not open video source {input_source}")
    #             await self._broadcast({"error": "Could not open video source"})
    #             return

    #         logger.info("Started processing frames")
    #         while self.running and self.cap.isOpened():
    #             start_time = time.time()

    #             success, frame = self.cap.read()
    #             if not success:
    #                 logger.info("End of video or camera disconnected")
    #                 await self._broadcast({"error": "Video source disconnected"})
    #                 break

    #             # Process frame with the current analyzer if selected
    #             if self.current_analyzer:
    #                 try:
    #                     processed_data = await self.current_analyzer.process_video(frame)
    #                     if processed_data:
    #                         await self._broadcast(processed_data)
    #                 except Exception as e:
    #                     logger.error(f"Error processing frame: {e}")
    #                     await self._broadcast({"error": f"Frame processing error: {str(e)}"})

    #             # Maintain ~30 FPS
    #             processing_time = time.time() - start_time
    #             await asyncio.sleep(max(0, 0.033 - processing_time))  # Target ~30fps

    #     except Exception as e:
    #         logger.error(f"Error during frame processing: {e}")
    #         await self._broadcast({"error": f"Frame processing error: {str(e)}"})
    #     finally:
    #         if self.cap:
    #             self.cap.release()
    #             self.cap = None
            
    #         # Generate report if analyzer exists
    #         if self.current_analyzer:
    #             try:
    #                 report = self.current_analyzer.generate_report()
    #                 if report is not None:
    #                     print("\n" + report)
    #                     with open('report.txt', 'w') as f:
    #                         f.write(report)
    #                     # Send report to clients
    #                     await self._broadcast({"type": "report", "data": report})
    #                 else:
    #                     logger.warning("No report was generated (returned None)")
    #             except Exception as e:
    #                 logger.error(f"Error generating report: {e}")
            
    #         logger.info("Video processing stopped")
    #         # Notify clients that processing has stopped
    #         await self._broadcast({"status": "stopped"})
            
    async def _broadcast(self, message):
        """Broadcast a message to all connected clients."""
        if not self.clients:
            return
            
        dead_clients = set()
        message_json = json.dumps(message)
        
        for client in self.clients:
            try:
                await client.send(message_json)
            except websockets.exceptions.ConnectionClosed:
                dead_clients.add(client)
            except Exception as e:
                logger.error(f"Error broadcasting to client: {e}")
                dead_clients.add(client)
                
        # Remove dead clients
        self.clients -= dead_clients
        if dead_clients:
            logger.info(f"Removed {len(dead_clients)} dead clients")

    def broadcast_message(self, message):
        """Broadcast a message to all connected clients from any thread."""
        if self.event_loop and self.clients:
            asyncio.run_coroutine_threadsafe(self._broadcast(message), self.event_loop)

    async def websocket_handler(self, websocket):
        """Handle incoming WebSocket connections."""
        self.clients.add(websocket)
        client_info = f"{websocket.remote_address[0]}:{websocket.remote_address[1]}"
        logger.info(f"New client connected: {client_info}")
        
        # Send initial connection status
        await websocket.send(json.dumps({"status": "connected"}))
        
        try:
            async for message in websocket:
                try:
                    data = json.loads(message)
                    action = data.get('action')
                    exercise = data.get('exercise')
                    self.language = data.get("language")
                    print(self.language, "This is language value")
                    self.audiobot = data.get("audiobot")
                    print(self.audiobot, "This is audiobot value")
                    logger.info(f"Received action: {action}, exercise: {exercise}")

                    if action == 'connect':
                        await websocket.send(json.dumps({"status": "connected"}))
                    elif action == 'start':
                        if exercise in self.analyzers:
                            await self.start_exercise(exercise, websocket)
                        else:
                            await websocket.send(json.dumps({"error": f"Invalid exercise: {exercise}"}))
                    elif action == 'stop':
                        await self.stop_exercise(websocket)
                    elif action == 'disconnect':
                        logger.info(f"Client requested disconnect: {client_info}")
                        await websocket.send(json.dumps({"status": "disconnected"}))
                        # Client will be removed in the finally block
                        break
                    else:
                        logger.warning(f"Unknown action: {action}")
                        await websocket.send(json.dumps({"error": "Unknown action"}))
                except json.JSONDecodeError:
                    logger.error("Invalid JSON received")
                    await websocket.send(json.dumps({"error": "Invalid request format"}))
                except Exception as e:
                    logger.error(f"Error handling message: {e}")
                    await websocket.send(json.dumps({"error": f"Server error: {str(e)}"}))
        except websockets.ConnectionClosed:
            logger.info(f"Client disconnected: {client_info}")
        except Exception as e:
            logger.error(f"Unexpected error in websocket handler: {e}")
        finally:
            self.clients.remove(websocket)
            logger.info(f"Client removed: {client_info}")

    async def start_exercise(self, exercise, websocket):
        """Start processing frames for the specified exercise."""
        if self.running:
            await websocket.send(json.dumps({"status": "already_running"}))
            return

        try:
            self.current_analyzer = self.analyzers[exercise]
            self.current_analyzer.reset_counters()  # Reset counters for new exercise
            self.running = True
            
            # Cancel any existing task
            if self.frame_processing_task and not self.frame_processing_task.done():
                self.frame_processing_task.cancel()
                
            # Start new task
            self.frame_processing_task = asyncio.create_task(self.process_frames())
            await websocket.send(json.dumps({"status": "started", "exercise": exercise}))
            logger.info(f"Started exercise: {exercise}")
        except Exception as e:
            logger.error(f"Error starting exercise: {e}")
            await websocket.send(json.dumps({"error": f"Failed to start {exercise}: {str(e)}"}))

    async def stop_exercise(self, websocket):
        """Stop processing frames."""
        if not self.running:
            await websocket.send(json.dumps({"status": "not_running"}))
            return

        self.running = False
        await websocket.send(json.dumps({"status": "stopping"}))
        
        # Wait for frame processing to complete
        if self.frame_processing_task and not self.frame_processing_task.done():
            try:
                # Give it some time to clean up
                await asyncio.wait_for(asyncio.shield(self.frame_processing_task), timeout=2.0)
            except asyncio.TimeoutError:
                # If it takes too long, cancel it
                self.frame_processing_task.cancel()
                logger.warning("Frame processing task took too long to stop, cancelled it")
                
        logger.info("Exercise stopped")

    def start_server(self, host='localhost', port=8765):
        """Start the WebSocket server."""
        def run_event_loop(loop):
            asyncio.set_event_loop(loop)
            try:
                loop.run_forever()
            except Exception as e:
                logger.error(f"Error in event loop: {e}")
            finally:
                # Clean up pending tasks
                pending = asyncio.all_tasks(loop)
                for task in pending:
                    task.cancel()
                # Close the loop
                loop.run_until_complete(loop.shutdown_asyncgens())
                loop.close()

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
        try:
            self.server = await websockets.serve(
                self.websocket_handler,
                host,
                port,
                ping_interval=30,
                ping_timeout=10
            )
            logger.info(f"WebSocket server running at ws://{host}:{port}")
        except Exception as e:
            logger.error(f"Failed to start WebSocket server: {e}")
            # Try to shut down gracefully
            if hasattr(self, 'event_loop') and self.event_loop:
                self.event_loop.call_soon_threadsafe(self.event_loop.stop)

    def stop_server(self):
        """Stop the WebSocket server."""
        self.running = False
        
        if self.server:
            self.server.close()
            if self.event_loop:
                asyncio.run_coroutine_threadsafe(self.server.wait_closed(), self.event_loop)
            
        if self.event_loop:
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