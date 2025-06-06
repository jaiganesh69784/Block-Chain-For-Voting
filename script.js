// Enhanced Security and Biometric Voting System
class SecureBiometricVotingSystem {
    constructor() {
        this.selectedCandidate = null;
        this.isProcessing = false;
        this.sessionToken = this.generateSessionToken();
        this.biometricVerified = false;
        this.currentStream = null;
        this.initializeEventListeners();
        this.initializeSecurity();
    }

    generateSessionToken() {
        return 'session_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    }

    initializeEventListeners() {
        // Registration form
        document.getElementById('registration-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegistration();
        });

        // Voting form
        document.getElementById('voting-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleVoting();
        });

        // Candidate selection
        document.querySelectorAll('.candidate-option').forEach(option => {
            option.addEventListener('click', () => {
                this.selectCandidate(option);
            });
        });

        // UIN input validation
        document.getElementById('voterUIN').addEventListener('input', (e) => {
            this.validateUIN(e.target.value);
        });

        // Photo upload options
        document.getElementById('take-photo-btn').addEventListener('click', () => {
            this.openCamera('registration');
        });

        document.getElementById('upload-photo-btn').addEventListener('click', () => {
            document.getElementById('photo').click();
        });

        // Photo upload validation
        document.getElementById('photo').addEventListener('change', (e) => {
            this.validatePhoto(e.target.files[0]);
        });

        // Biometric verification button
        document.getElementById('verify-biometric-btn').addEventListener('click', () => {
            this.startBiometricVerification();
        });
    }

    initializeSecurity() {
        this.requestCount = 0;
        this.lastRequestTime = Date.now();
        this.csrfToken = this.generateCSRFToken();
        this.sessionTimeout = 5 * 60 * 1000;
        this.startSessionTimer();
    }

    generateCSRFToken() {
        return 'csrf_' + Math.random().toString(36).substr(2, 16);
    }

    startSessionTimer() {
        setTimeout(() => {
            this.showAlert('vote-alert', 'Session expired. Please refresh the page.', 'warning');
        }, this.sessionTimeout);
    }

    validateRateLimit() {
        const now = Date.now();
        if (now - this.lastRequestTime < 1000) {
            this.requestCount++;
            if (this.requestCount > 5) {
                this.showAlert('vote-alert', 'Too many requests. Please wait before trying again.', 'error');
                return false;
            }
        } else {
            this.requestCount = 0;
        }
        this.lastRequestTime = now;
        return true;
    }

    async openCamera(purpose) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                } 
            });
            
            this.currentStream = stream;
            
            if (purpose === 'registration') {
                this.showCameraModal('registration');
            } else if (purpose === 'verification') {
                this.showCameraModal('verification');
            }
            
            const video = document.getElementById(`${purpose}-video`);
            video.srcObject = stream;
            video.play();
            
        } catch (error) {
            console.error('Camera access error:', error);
            this.showAlert('register-alert', 'Camera access denied. Please allow camera access or upload a photo.', 'error');
        }
    }

    showCameraModal(type) {
        const modal = document.getElementById(`${type}-camera-modal`);
        modal.style.display = 'block';
    }

    closeCameraModal(type) {
        const modal = document.getElementById(`${type}-camera-modal`);
        modal.style.display = 'none';
        
        if (this.currentStream) {
            this.currentStream.getTracks().forEach(track => track.stop());
            this.currentStream = null;
        }
    }

    capturePhoto(purpose) {
        const video = document.getElementById(`${purpose}-video`);
        const canvas = document.getElementById(`${purpose}-canvas`);
        const context = canvas.getContext('2d');
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);
        
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        
        if (purpose === 'registration') {
            this.handleCapturedRegistrationPhoto(imageData);
        } else if (purpose === 'verification') {
            this.handleCapturedVerificationPhoto(imageData);
        }
        
        this.closeCameraModal(purpose);
    }

    handleCapturedRegistrationPhoto(imageData) {
        // Convert data URL to blob and create file
        const blob = this.dataURLtoBlob(imageData);
        const file = new File([blob], 'captured_photo.jpg', { type: 'image/jpeg' });
        
        // Create a new FileList-like object
        const dt = new DataTransfer();
        dt.items.add(file);
        document.getElementById('photo').files = dt.files;
        
        this.validatePhoto(file);
        this.showAlert('register-alert', 'Photo captured successfully!', 'success');
    }

    async handleCapturedVerificationPhoto(imageData) {
        try {
            const uin = document.getElementById('voterUIN').value.trim();
            
            if (!uin) {
                this.showAlert('vote-alert', 'Please enter your UIN first.', 'error');
                return;
            }

            this.showLoading('biometric-verification');
            
            const response = await fetch('/api/verify-biometric', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    voterUIN: uin,
                    capturedImage: imageData
                })
            });

            const result = await response.json();
            
            if (result.success) {
                this.biometricVerified = true;
                this.showAlert('vote-alert', 
                    `Biometric verification successful! Welcome, ${result.voterName}. Confidence: ${(result.confidence * 100).toFixed(1)}%`, 
                    'success'
                );
                this.updateVotingUI(true);
            } else {
                this.biometricVerified = false;
                this.showAlert('vote-alert', 
                    `Biometric verification failed. ${result.message}`, 
                    'error'
                );
                this.updateVotingUI(false);
            }

        } catch (error) {
            console.error('Biometric verification error:', error);
            this.showAlert('vote-alert', 'Biometric verification failed. Please try again.', 'error');
        } finally {
            this.hideLoading('biometric-verification');
        }
    }

    dataURLtoBlob(dataURL) {
        const arr = dataURL.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
    }

    async startBiometricVerification() {
        await this.openCamera('verification');
    }

    updateVotingUI(verified) {
        const submitBtn = document.querySelector('#voting-form button[type="submit"]');
        const biometricStatus = document.getElementById('biometric-status');
        
        if (verified && this.selectedCandidate) {
            submitBtn.disabled = false;
            submitBtn.classList.add('btn-success');
            biometricStatus.innerHTML = '<i class="fas fa-check-circle" style="color: #10b981;"></i> Biometric Verified';
        } else {
            submitBtn.disabled = true;
            submitBtn.classList.remove('btn-success');
            if (!verified) {
                biometricStatus.innerHTML = '<i class="fas fa-times-circle" style="color: #ef4444;"></i> Biometric Required';
            }
        }
    }

    validateUIN(uin) {
        const submitBtn = document.querySelector('#voting-form button[type="submit"]');
        
        if (uin.length >= 8 && this.selectedCandidate && this.biometricVerified) {
            submitBtn.disabled = false;
            submitBtn.classList.add('btn-success');
        } else {
            submitBtn.disabled = true;
            submitBtn.classList.remove('btn-success');
        }

        if (uin.length > 0 && !/^[a-f0-9-]{8,}$/i.test(uin)) {
            this.showAlert('vote-alert', 'Invalid UIN format. Please check your UIN.', 'error');
        } else if (uin.length > 0) {
            this.hideAlert('vote-alert');
        }
    }

    validatePhoto(file) {
        if (!file) return;

        const maxSize = 5 * 1024 * 1024; // 5MB
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];

        if (file.size > maxSize) {
            this.showAlert('register-alert', 'Photo size must be less than 5MB.', 'error');
            document.getElementById('photo').value = '';
            return false;
        }

        if (!allowedTypes.includes(file.type)) {
            this.showAlert('register-alert', 'Please upload a valid image file (JPG, PNG).', 'error');
            document.getElementById('photo').value = '';
            return false;
        }

        this.hideAlert('register-alert');
        return true;
    }

    selectCandidate(option) {
        document.querySelectorAll('.candidate-option').forEach(opt => {
            opt.classList.remove('selected');
        });

        option.classList.add('selected');
        this.selectedCandidate = option.dataset.candidate;

        const uin = document.getElementById('voterUIN').value;
        const submitBtn = document.querySelector('#voting-form button[type="submit"]');
        
        if (uin.length >= 8 && this.biometricVerified) {
            submitBtn.disabled = false;
            submitBtn.classList.add('btn-success');
        }

        this.hideAlert('vote-alert');
    }

    async handleRegistration() {
        if (this.isProcessing || !this.validateRateLimit()) return;

        this.isProcessing = true;
        this.showLoading('registration-form');

        try {
            const formData = new FormData();
            formData.append('firstName', document.getElementById('firstName').value.trim());
            formData.append('lastName', document.getElementById('lastName').value.trim());
            formData.append('email', document.getElementById('email').value.trim());
            formData.append('phone', document.getElementById('phone').value.trim());
            formData.append('age', document.getElementById('age').value);
            formData.append('birthPlace', document.getElementById('birthPlace').value.trim());
            
            const photoFile = document.getElementById('photo').files[0];
            if (photoFile) {
                formData.append('photo', photoFile);
            }

            const response = await fetch('/api/register', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            
            if (result.success) {
                this.showAlert('register-alert', result.message, 'success');
                document.getElementById('registration-form').reset();
            } else {
                this.showAlert('register-alert', result.message, 'error');
            }

        } catch (error) {
            console.error('Registration error:', error);
            this.showAlert('register-alert', 'Network error. Please check your connection and try again.', 'error');
        } finally {
            this.isProcessing = false;
            this.hideLoading('registration-form');
        }
    }

    async handleVoting() {
        if (this.isProcessing || !this.validateRateLimit()) return;

        if (!this.selectedCandidate) {
            this.showAlert('vote-alert', 'Please select a candidate before voting.', 'error');
            return;
        }

        if (!this.biometricVerified) {
            this.showAlert('vote-alert', 'Please complete biometric verification before voting.', 'error');
            return;
        }

        this.isProcessing = true;
        this.showVerificationModal();

        try {
            const uin = document.getElementById('voterUIN').value.trim();
            
            const response = await fetch('/api/vote', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    voterUIN: uin,
                    candidate: this.selectedCandidate,
                    biometricVerified: this.biometricVerified
                })
            });

            const result = await response.json();
            
            this.closeModal();

            if (result.success) {
                this.showAlert('vote-alert', 
                    `Vote cast successfully for ${this.selectedCandidate}! Your vote has been recorded on the blockchain.`, 
                    'success'
                );
                this.resetVotingForm();
            } else {
                this.showAlert('vote-alert', result.message, 'error');
            }

        } catch (error) {
            console.error('Voting error:', error);
            this.closeModal();
            this.showAlert('vote-alert', 'Network error. Please check your connection and try again.', 'error');
        } finally {
            this.isProcessing = false;
        }
    }

    showVerificationModal() {
        document.getElementById('verification-modal').style.display = 'block';
    }

    closeModal() {
        document.getElementById('verification-modal').style.display = 'none';
    }

    resetVotingForm() {
        document.getElementById('voterUIN').value = '';
        document.querySelectorAll('.candidate-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        this.selectedCandidate = null;
        this.biometricVerified = false;
        document.querySelector('#voting-form button[type="submit"]').disabled = true;
        document.getElementById('biometric-status').innerHTML = '<i class="fas fa-times-circle" style="color: #ef4444;"></i> Biometric Required';
    }

    showLoading(formId) {
        const form = document.getElementById(formId);
        const button = form.querySelector('button[type="submit"]') || form.querySelector('button');
        const btnText = button.querySelector('.btn-text');
        const loading = button.querySelector('.loading');
        
        if (btnText) btnText.style.display = 'none';
        if (loading) loading.style.display = 'flex';
        button.disabled = true;
    }

    hideLoading(formId) {
        const form = document.getElementById(formId);
        const button = form.querySelector('button[type="submit"]') || form.querySelector('button');
        const btnText = button.querySelector('.btn-text');
        const loading = button.querySelector('.loading');
        
        if (btnText) btnText.style.display = 'flex';
        if (loading) loading.style.display = 'none';
        button.disabled = false;
    }

    showAlert(alertId, message, type) {
        const alert = document.getElementById(alertId);
        alert.textContent = message;
        alert.className = `alert alert-${type}`;
        alert.style.display = 'block';
        
        if (type === 'success') {
            setTimeout(() => this.hideAlert(alertId), 5000);
        }
    }

    hideAlert(alertId) {
        const alert = document.getElementById(alertId);
        alert.style.display = 'none';
    }
}

// Utility functions
function showResults() {
    window.open('/results', '_blank');
}

function showSampleUINs() {
    fetch('/api/sample-uins')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                let content = 'Sample UINs for Testing:\n\n';
                data.voters.forEach(voter => {
                    content += `${voter.name}: ${voter.uin}\n`;
                });
                alert(content);
            }
        })
        .catch(error => {
            console.error('Error fetching sample UINs:', error);
            alert('Error loading sample UINs');
        });
}

function showBlockchain() {
    window.open('/blockchain', '_blank');
}

function closeModal() {
    document.getElementById('verification-modal').style.display = 'none';
}

function closeCameraModal(type) {
    const system = window.votingSystem;
    if (system) {
        system.closeCameraModal(type);
    }
}

function capturePhoto(purpose) {
    const system = window.votingSystem;
    if (system) {
        system.capturePhoto(purpose);
    }
}

// Initialize the system when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.votingSystem = new SecureBiometricVotingSystem();
});

// Security enhancements
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'F12' || 
        (e.ctrlKey && e.shiftKey && e.key === 'I') || 
        (e.ctrlKey && e.key === 'u')) {
        e.preventDefault();
    }
});

document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', (e) => e.preventDefault());