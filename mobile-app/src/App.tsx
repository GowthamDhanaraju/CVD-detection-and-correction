import React, { useState, useEffect } from 'react'
import './App.css'

interface HealthStatus {
  status: string;
  version: string;
  timestamp: string;
}

interface TestQuestion {
  question_id: string;
  image_original: string;
  image_filtered: string;
  correct_answer: boolean;
}

interface TestData {
  test_id: string;
  test_type: string;
  questions: TestQuestion[];
}

interface TestResults {
  overall_severity: string;
  protanopia_severity: number;
  deuteranopia_severity: number;
  tritanopia_severity: number;
  timestamp: string;
}

function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [testData, setTestData] = useState<TestData | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testResults, setTestResults] = useState<TestResults | null>(null);
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);
  const [activeFilter, setActiveFilter] = useState('off');
  const [videoRef, setVideoRef] = useState<HTMLVideoElement | null>(null);

  useEffect(() => {
    checkHealth();
    loadTestResults();
  }, []);

  const checkHealth = async () => {
    try {
      const response = await fetch('/api/health');
      if (response.ok) {
        const data = await response.json();
        setHealthStatus(data);
      }
    } catch (error) {
      console.error('Health check failed:', error);
    }
  };

  const loadTestResults = () => {
    const saved = localStorage.getItem('cvd_test_results');
    if (saved) {
      setTestResults(JSON.parse(saved));
    }
  };

  const startTest = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/test/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test_type: 'ishihara', num_questions: 3 }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setTestData(data);
        setCurrentQuestion(0);
        setActiveTab('test');
      }
    } catch (error) {
      console.error('Failed to start test:', error);
      alert('Failed to start test. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const submitResponse = async (response: boolean) => {
    if (!testData) return;

    try {
      await fetch('/api/test/response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test_id: testData.test_id,
          question_id: testData.questions[currentQuestion].question_id,
          response: response,
        }),
      });

      if (currentQuestion < testData.questions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
      } else {
        await completeTest();
      }
    } catch (error) {
      console.error('Failed to submit response:', error);
    }
  };

  const completeTest = async () => {
    if (!testData) return;

    try {
      setLoading(true);
      const response = await fetch('/api/test/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test_id: testData.test_id }),
      });

      if (response.ok) {
        const results = await response.json();
        setTestResults(results);
        localStorage.setItem('cvd_test_results', JSON.stringify(results));
        setActiveTab('home');
        alert(`Test Complete! Overall Severity: ${results.overall_severity}`);
      }
    } catch (error) {
      console.error('Failed to complete test:', error);
    } finally {
      setLoading(false);
    }
  };

  const startCamera = async () => {
    try {
      console.log('Attempting camera access...');
      console.log('Navigator available:', !!navigator.mediaDevices);
      console.log('getUserMedia available:', !!navigator.mediaDevices?.getUserMedia);
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported');
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 }
        } 
      });
      
      console.log('Camera stream obtained successfully');
      
      if (videoRef) {
        videoRef.srcObject = stream;
        videoRef.play();
        setCameraPermission(true);
        console.log('Camera started successfully');
      }
    } catch (error) {
      console.error('Camera access error:', error);
      const err = error as any;
      console.error('Error name:', err.name);
      console.error('Error message:', err.message);
      setCameraPermission(false);
      
      // Provide user-friendly error messages
      let errorMessage = 'Camera access failed: ';
      if (err.name === 'NotAllowedError') {
        errorMessage += 'Permission denied. Please allow camera access and try again.';
      } else if (err.name === 'NotFoundError') {
        errorMessage += 'No camera found on this device.';
      } else if (err.name === 'NotSupportedError') {
        errorMessage += 'Camera not supported on this device/browser.';
      } else {
        errorMessage += err.message || 'Unknown camera error';
      }
      
      alert(errorMessage);
    }
  };

  const applyFilter = (filterId: string) => {
    setActiveFilter(filterId);
    if (videoRef) {
      let filterStyle = '';
      switch (filterId) {
        case 'protanopia':
          filterStyle = 'hue-rotate(15deg) saturate(1.3)';
          break;
        case 'deuteranopia':
          filterStyle = 'saturate(1.4) contrast(1.1)';
          break;
        case 'tritanopia':
          filterStyle = 'hue-rotate(-10deg) saturate(1.2)';
          break;
        case 'smart_ai':
          filterStyle = 'saturate(1.3) contrast(1.1) hue-rotate(5deg)';
          break;
        default:
          filterStyle = 'none';
      }
      videoRef.style.filter = filterStyle;
    }
  };

  const renderHomeTab = () => (
    <div className="tab-content">
      <h2>🌈 CVD Detection Micro</h2>
      <p>Advanced Color Vision Testing with Real-Time AI Correction</p>
      
      <div className="card">
        <h3>🔗 Backend Status</h3>
        {healthStatus ? (
          <div className="status-success">
            ✅ Connected - Version: {healthStatus.version}
          </div>
        ) : (
          <div className="status-error">❌ Disconnected</div>
        )}
        <button onClick={checkHealth}>🔄 Refresh</button>
      </div>

      <div className="card">
        <h3>📊 Latest Test Results</h3>
        {testResults ? (
          <div>
            <p><strong>Overall Severity:</strong> {testResults.overall_severity.toUpperCase()}</p>
            <p>Protanopia: {Math.round(testResults.protanopia_severity * 100)}%</p>
            <p>Deuteranopia: {Math.round(testResults.deuteranopia_severity * 100)}%</p>
            <p>Tritanopia: {Math.round(testResults.tritanopia_severity * 100)}%</p>
          </div>
        ) : (
          <p>No test results available</p>
        )}
      </div>

      <div className="card">
        <h3>⚡ Quick Actions</h3>
        <button onClick={startTest} disabled={loading}>
          {loading ? 'Loading...' : '🧪 Start CVD Test'}
        </button>
        <button onClick={() => setActiveTab('camera')}>📱 Open Live Filter</button>
      </div>
    </div>
  );

  const renderTestTab = () => {
    if (!testData) {
      return (
        <div className="tab-content">
          <h2>CVD Detection Test</h2>
          <p>Click "Start CVD Test" from the home page to begin.</p>
        </div>
      );
    }

    const question = testData.questions[currentQuestion];
    const progress = ((currentQuestion + 1) / testData.questions.length) * 100;

    return (
      <div className="tab-content">
        <h2>CVD Detection Test</h2>
        <p>Question {currentQuestion + 1} of {testData.questions.length}</p>
        
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }}></div>
        </div>

        <h3>Do the original and filtered images look exactly the same to you?</h3>
        
        <div className="test-images">
          <div className="image-container">
            <h4>Original</h4>
            <img src={question.image_original} alt="Original" className="test-image" />
          </div>
          <div className="image-container">
            <h4>Filtered</h4>
            <img src={question.image_filtered} alt="Filtered" className="test-image" />
          </div>
        </div>

        <div className="response-buttons">
          <button className="btn-same" onClick={() => submitResponse(true)}>
            Yes, Same
          </button>
          <button className="btn-different" onClick={() => submitResponse(false)}>
            No, Different
          </button>
        </div>
      </div>
    );
  };

  const renderCameraTab = () => (
    <div className="tab-content">
      <h2>Live Color Filters</h2>
      
      {!window.location.protocol.includes('https') && window.location.hostname !== 'localhost' && (
        <div className="camera-warning">
          <p>⚠️ <strong>Camera requires HTTPS</strong></p>
          <p>Camera access may not work on HTTP. For full functionality, access via HTTPS.</p>
        </div>
      )}
      
      <div className="camera-container">
        <video 
          ref={setVideoRef}
          autoPlay 
          playsInline 
          className="camera-video"
          width="640" 
          height="480"
        />
        {cameraPermission === null && (
          <div className="camera-overlay">
            <p>Camera access is needed for live CVD filters</p>
            <button onClick={startCamera}>📷 Start Camera</button>
            <small>Grant camera permission when prompted</small>
          </div>
        )}
        {cameraPermission === false && (
          <div className="camera-overlay">
            <p>❌ Camera access denied</p>
            <p>To use live filters:</p>
            <ol>
              <li>Click "Try Again"</li>
              <li>Allow camera access when prompted</li>
              <li>Or check browser settings</li>
            </ol>
            <button onClick={startCamera}>Try Again</button>
          </div>
        )}
      </div>

      <div className="filter-controls">
        <h3>Active Filter: {activeFilter.replace('_', ' ').toUpperCase()}</h3>
        <div className="filter-buttons">
          <button 
            className={activeFilter === 'off' ? 'active' : ''}
            onClick={() => applyFilter('off')}
          >
            👁️ No Filter
          </button>
          <button 
            className={activeFilter === 'protanopia' ? 'active' : ''}
            onClick={() => applyFilter('protanopia')}
          >
            🔴 Protanopia
          </button>
          <button 
            className={activeFilter === 'deuteranopia' ? 'active' : ''}
            onClick={() => applyFilter('deuteranopia')}
          >
            🟢 Deuteranopia
          </button>
          <button 
            className={activeFilter === 'tritanopia' ? 'active' : ''}
            onClick={() => applyFilter('tritanopia')}
          >
            🔵 Tritanopia
          </button>
          <button 
            className={activeFilter === 'smart_ai' ? 'active' : ''}
            onClick={() => applyFilter('smart_ai')}
          >
            🤖 Smart AI
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="App">
      <nav className="nav-tabs">
        <button 
          className={activeTab === 'home' ? 'active' : ''}
          onClick={() => setActiveTab('home')}
        >
          🏠 Home
        </button>
        <button 
          className={activeTab === 'test' ? 'active' : ''}
          onClick={() => setActiveTab('test')}
        >
          👁️ Test
        </button>
        <button 
          className={activeTab === 'camera' ? 'active' : ''}
          onClick={() => setActiveTab('camera')}
        >
          📷 Camera
        </button>
      </nav>

      {activeTab === 'home' && renderHomeTab()}
      {activeTab === 'test' && renderTestTab()}
      {activeTab === 'camera' && renderCameraTab()}
    </div>
  );
}

export default App