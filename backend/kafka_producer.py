"""
Kafka Producer for CVD Detection Feedback System

This module handles sending feedback data to Kafka topics for later processing.
Supports both synchronous and asynchronous feedback submission.
"""

import json
import logging
import time
import os
from datetime import datetime
from typing import Dict, Any, Optional
try:
    from kafka import KafkaProducer
    from kafka.errors import KafkaError
    KAFKA_AVAILABLE = True
except ImportError:
    logger = logging.getLogger(__name__)
    logger.warning("Kafka library not installed. Feedback will be stored locally only.")
    KafkaProducer = None
    KafkaError = Exception
    KAFKA_AVAILABLE = False
import threading

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CVDFeedbackKafkaProducer:
    """
    Kafka producer for CVD Detection feedback events
    """
    
    def __init__(self, 
                 bootstrap_servers: str = 'localhost:9092',
                 topic_name: str = 'cvd-feedback-events',
                 enable_async: bool = True):
        """
        Initialize Kafka producer
        
        Args:
            bootstrap_servers: Kafka broker addresses
            topic_name: Topic name for feedback events
            enable_async: Enable asynchronous message sending
        """
        self.bootstrap_servers = bootstrap_servers
        self.topic_name = topic_name
        self.enable_async = enable_async
        self.producer = None
        self.is_connected = False
        
        # Statistics
        self.messages_sent = 0
        self.messages_failed = 0
        
        # Initialize producer
        self._initialize_producer()
    
    def _initialize_producer(self):
        """Initialize Kafka producer with error handling"""
        if not KAFKA_AVAILABLE:
            logger.warning("Kafka not available. All feedback will be stored locally.")
            self.is_connected = False
            return
            
        try:
            self.producer = KafkaProducer(
                bootstrap_servers=self.bootstrap_servers,
                value_serializer=lambda v: json.dumps(v).encode('utf-8'),
                key_serializer=lambda k: k.encode('utf-8') if k else None,
                retry_backoff_ms=100,
                request_timeout_ms=5000,
                acks='all',  # Wait for all replicas to acknowledge
                retries=3,
                batch_size=16384,
                linger_ms=10,  # Wait up to 10ms for batching
                compression_type='gzip'
            )
            self.is_connected = True
            logger.info(f"Kafka producer connected to {self.bootstrap_servers}")
            
        except Exception as e:
            logger.error(f"Failed to initialize Kafka producer: {e}")
            self.is_connected = False
            self.producer = None
    
    def send_feedback_event(self, 
                          feedback_data: Dict[str, Any], 
                          user_id: str,
                          session_id: Optional[str] = None) -> bool:
        """
        Send feedback event to Kafka
        
        Args:
            feedback_data: Feedback data dictionary
            user_id: User identifier
            session_id: Session identifier
            
        Returns:
            bool: True if sent successfully, False otherwise
        """
        if not self.is_connected or not self.producer:
            logger.warning("Kafka producer not connected, storing feedback locally")
            return self._store_feedback_locally(feedback_data, user_id)
        
        try:
            # Create Kafka event
            event = {
                'event_type': 'feedback_submitted',
                'data': feedback_data,
                'metadata': {
                    'timestamp': datetime.now().isoformat(),
                    'session_id': session_id or f"session_{int(time.time())}",
                    'user_id': user_id,
                    'producer_id': 'cvd-backend',
                    'version': '1.0'
                }
            }
            
            # Create message key for partitioning
            message_key = f"{user_id}_{feedback_data.get('page_name', 'unknown')}"
            
            if self.enable_async:
                # Send asynchronously
                future = self.producer.send(
                    self.topic_name,
                    key=message_key,
                    value=event
                )
                
                # Add callback for success/failure
                future.add_callback(self._on_send_success)
                future.add_errback(self._on_send_error)
                
                # Don't wait for the result
                self.messages_sent += 1
                logger.info(f"Feedback event queued for user {user_id}")
                return True
                
            else:
                # Send synchronously
                record_metadata = self.producer.send(
                    self.topic_name,
                    key=message_key,
                    value=event
                ).get(timeout=10)
                
                self.messages_sent += 1
                logger.info(f"Feedback event sent successfully: {record_metadata}")
                return True
                
        except KafkaError as e:
            logger.error(f"Kafka error sending feedback: {e}")
            self.messages_failed += 1
            return self._store_feedback_locally(feedback_data, user_id)
            
        except Exception as e:
            logger.error(f"Unexpected error sending feedback: {e}")
            self.messages_failed += 1
            return self._store_feedback_locally(feedback_data, user_id)
    
    def _on_send_success(self, record_metadata):
        """Callback for successful message send"""
        logger.debug(f"Message sent to {record_metadata.topic} partition {record_metadata.partition} offset {record_metadata.offset}")
    
    def _on_send_error(self, excp):
        """Callback for failed message send"""
        logger.error(f"Failed to send message: {excp}")
        self.messages_failed += 1
    
    def _store_feedback_locally(self, feedback_data: Dict[str, Any], user_id: str) -> bool:
        """
        Store feedback locally when Kafka is unavailable
        
        Args:
            feedback_data: Feedback data to store
            user_id: User identifier
            
        Returns:
            bool: True if stored successfully
        """
        try:
            import os
            import json
            
            # Create local storage directory
            storage_dir = os.path.join(os.path.dirname(__file__), 'data', 'feedback_queue')
            os.makedirs(storage_dir, exist_ok=True)
            
            # Create filename with timestamp
            timestamp = int(time.time())
            filename = f"feedback_{user_id}_{timestamp}.json"
            filepath = os.path.join(storage_dir, filename)
            
            # Store feedback data
            with open(filepath, 'w') as f:
                json.dump({
                    'feedback_data': feedback_data,
                    'user_id': user_id,
                    'stored_at': datetime.now().isoformat(),
                    'status': 'pending_kafka_send'
                }, f, indent=2)
            
            logger.info(f"Feedback stored locally: {filepath}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to store feedback locally: {e}")
            return False
    
    def send_user_action_event(self, 
                             action_type: str, 
                             user_id: str, 
                             context: Dict[str, Any]) -> bool:
        """
        Send user action event to Kafka
        
        Args:
            action_type: Type of action (page_view, test_completed, filter_applied, etc.)
            user_id: User identifier
            context: Action context data
            
        Returns:
            bool: True if sent successfully
        """
        action_data = {
            'action_type': action_type,
            'user_id': user_id,
            'context': context,
            'timestamp': datetime.now().isoformat()
        }
        
        return self.send_feedback_event(action_data, user_id)
    
    def flush_and_close(self):
        """Flush pending messages and close producer"""
        if self.producer:
            try:
                self.producer.flush(timeout=10)
                self.producer.close()
                logger.info("Kafka producer closed successfully")
            except Exception as e:
                logger.error(f"Error closing Kafka producer: {e}")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get producer statistics"""
        return {
            'is_connected': self.is_connected,
            'messages_sent': self.messages_sent,
            'messages_failed': self.messages_failed,
            'topic_name': self.topic_name,
            'bootstrap_servers': self.bootstrap_servers
        }
    
    def health_check(self) -> Dict[str, Any]:
        """Check Kafka connection health"""
        try:
            if self.producer:
                # Try to get metadata
                metadata = self.producer.list_consumer_groups()
                return {
                    'status': 'healthy',
                    'connected': True,
                    'producer_stats': self.get_stats()
                }
            else:
                return {
                    'status': 'unhealthy',
                    'connected': False,
                    'error': 'Producer not initialized'
                }
        except Exception as e:
            return {
                'status': 'unhealthy',
                'connected': False,
                'error': str(e)
            }

# Global producer instance
_kafka_producer = None

def get_kafka_producer() -> CVDFeedbackKafkaProducer:
    """Get or create global Kafka producer instance"""
    global _kafka_producer
    
    if _kafka_producer is None:
        # Read configuration from environment or config
        bootstrap_servers = os.getenv('KAFKA_BOOTSTRAP_SERVERS', 'localhost:9092')
        topic_name = os.getenv('KAFKA_FEEDBACK_TOPIC', 'cvd-feedback-events')
        
        _kafka_producer = CVDFeedbackKafkaProducer(
            bootstrap_servers=bootstrap_servers,
            topic_name=topic_name,
            enable_async=True
        )
    
    return _kafka_producer

# Cleanup function for graceful shutdown
def cleanup_kafka():
    """Cleanup Kafka producer on application shutdown"""
    global _kafka_producer
    if _kafka_producer:
        _kafka_producer.flush_and_close()
        _kafka_producer = None

# Register cleanup function
import atexit
atexit.register(cleanup_kafka)