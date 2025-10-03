#!/usr/bin/env python3
"""
Kafka Feedback Monitor
Check if Kafka is receiving feedback from the CVD Detection app
"""

import requests
import json
import time
from datetime import datetime

def check_kafka_health():
    """Check if Kafka producer is healthy"""
    try:
        response = requests.get('http://localhost:8001/api/v1/feedback/kafka/health')
        return response.json()
    except Exception as e:
        return {'error': str(e), 'status': 'unreachable'}

def get_feedback_analytics():
    """Get feedback analytics from the API"""
    try:
        response = requests.get('http://localhost:8001/api/v1/feedback/analytics')
        return response.json()
    except Exception as e:
        return {'error': str(e)}

def submit_test_feedback():
    """Submit test feedback to verify the system works"""
    test_feedback = {
        "user_id": "test_user_123",
        "page_name": "test_page",
        "feedback_type": "rating",
        "rating": 5,
        "comment": "Testing Kafka integration",
        "user_experience": {
            "ease_of_use": 5,
            "accuracy": 5,
            "usefulness": 5
        },
        "context": {
            "test_context": "monitoring_script"
        },
        "timestamp": datetime.now().isoformat(),
        "device_info": {
            "platform": "test",
            "os_version": "1.0",
            "app_version": "1.0.0"
        }
    }
    
    try:
        response = requests.post(
            'http://localhost:8001/api/v1/feedback/submit', 
            json=test_feedback
        )
        return response.json()
    except Exception as e:
        return {'error': str(e)}

def monitor_feedback():
    """Monitor feedback system"""
    print("🔍 CVD Detection Feedback Monitor")
    print("=" * 50)
    
    # Check Kafka health
    print("\n1. Checking Kafka Health...")
    kafka_health = check_kafka_health()
    print(f"   Status: {kafka_health.get('status', 'unknown')}")
    print(f"   Connected: {kafka_health.get('connected', False)}")
    if 'error' in kafka_health:
        print(f"   Error: {kafka_health['error']}")
    
    # Get current analytics
    print("\n2. Current Feedback Analytics...")
    analytics = get_feedback_analytics()
    if 'error' not in analytics:
        print(f"   Total Feedback: {analytics.get('total_feedback', 0)}")
        print(f"   Average Rating: {analytics.get('average_rating', 0)}")
        print(f"   Feedback by Page: {analytics.get('feedback_by_page', {})}")
        if analytics.get('kafka_stats'):
            kafka_stats = analytics['kafka_stats']
            print(f"   Kafka Messages Sent: {kafka_stats.get('messages_sent', 0)}")
            print(f"   Kafka Messages Failed: {kafka_stats.get('messages_failed', 0)}")
    else:
        print(f"   Error getting analytics: {analytics['error']}")
    
    # Submit test feedback
    print("\n3. Submitting Test Feedback...")
    test_result = submit_test_feedback()
    if 'error' not in test_result:
        print(f"   ✅ Test feedback submitted successfully!")
        print(f"   Feedback ID: {test_result.get('feedback_id')}")
        print(f"   Kafka Sent: {test_result.get('kafka_sent')}")
    else:
        print(f"   ❌ Error submitting test feedback: {test_result['error']}")
    
    # Wait and check again
    print("\n4. Waiting 3 seconds and checking again...")
    time.sleep(3)
    
    analytics_after = get_feedback_analytics()
    if 'error' not in analytics_after:
        print(f"   Total Feedback (after): {analytics_after.get('total_feedback', 0)}")
        if analytics_after.get('kafka_stats'):
            kafka_stats = analytics_after['kafka_stats']
            print(f"   Kafka Messages Sent (after): {kafka_stats.get('messages_sent', 0)}")
    
    print("\n📍 How to Check Local Feedback Storage:")
    print("   Check: backend/data/feedback/ directory")
    print("   Check: backend/data/feedback_queue/ directory (if Kafka failed)")
    
    print("\n📱 How to Test from App:")
    print("   1. Open: http://localhost:8082")
    print("   2. Click the blue 'Feedback' button")
    print("   3. Submit feedback")
    print("   4. Run this script again to see if it was received")

if __name__ == "__main__":
    monitor_feedback()