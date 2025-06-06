// Enhanced Security and UI Management
class SecureVotingSystem {
    constructor() {
        this.selectedCandidate = null;
        this.isProcessing = false;
        this.sessionToken = this.generateSessionToken();
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

        // Photo upload validation
        document.getElementById('photo').addEventListener('change', (e) => {
            this.validatePhoto(e.target.files[0]);
        });
    }

    initializeSecurity() {
        // Rate limiting simulation
        this.requestCount = 0;
        this.lastRequestTime = Date.now();
        
        // CSRF protection simulation
        this.csrfToken = this.generateCSRFToken();
        
        // Session timeout (5 minutes)
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
        if (now - this.lastRequestTime < 1000) { // 1 second between requests
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

    validateUIN(uin) {
        const submitBtn = document.querySelector('#voting-form button[type="submit"]');
        
        if (uin.length >= 8 && this.selectedCandidate) {
            submitBtn.disabled = false;
            submitBtn.classList.add('btn-success');
        } else {
            submitBtn.disabled = true;
            submitBtn.classList.remove('btn-success');
        }

        // Real-time UIN format validation
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
        // Remove previous selection
        document.querySelectorAll('.candidate-option').forEach(opt => {
            opt.classList.remove('selected');
        });

        // Add selection to clicked option
        option.classList.add('selected');
        this.selectedCandidate = option.dataset.candidate;

        // Enable vote button if UIN is also valid
        const uin = document.getElementById('voterUIN').value;
        const submitBtn = document.querySelector('#voting-form button[type="submit"]');
        
        if (uin.length >= 8) {
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
            // Validate form data
            const formData = this.getRegistrationData();
            if (!this.validateRegistrationData(formData)) {
                return;
            }

            // Simulate API call with enhanced security
            const response = await this.simulateRegistrationAPI(formData);
            
            if (response.success) {
                this.showAlert('register-alert', 
                    `Registration successful! Your UIN has been sent to ${formData.email}. Please check your email.`, 
                    'success'
                );
                document.getElementById('registration-form').reset();
            } else {
                this.showAlert('register-alert', response.message || 'Registration failed. Please try again.', 'error');
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

        this.isProcessing = true;
        this.showVerificationModal();

        try {
            const uin = document.getElementById('voterUIN').value.trim();
            
            // Enhanced UIN validation
            if (!this.validateUINFormat(uin)) {
                this.showAlert('vote-alert', 'Invalid UIN format. Please check your UIN.', 'error');
                return;
            }

            // Simulate biometric verification
            await this.simulateBiometricVerification();

            // Submit vote with enhanced security
            const response = await this.simulateVotingAPI(uin, this.selectedCandidate);
            
            this.closeModal();

            if (response.success) {
                this.showAlert('vote-alert', 
                    `Vote cast successfully for ${this.selectedCandidate}! Your vote has been recorded on the blockchain.`, 
                    'success'
                );
                this.resetVotingForm();
            } else {
                this.showAlert('vote-alert', response.message || 'Voting failed. Please try again.', 'error');
            }

        } catch (error) {
            console.error('Voting error:', error);
            this.closeModal();
            this.showAlert('vote-alert', 'Network error. Please check your connection and try again.', 'error');
        } finally {
            this.isProcessing = false;
        }
    }

    getRegistrationData() {
        return {
            firstName: document.getElementById('firstName').value.trim(),
            lastName: document.getElementById('lastName').value.trim(),
            email: document.getElementById('email').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            age: parseInt(document.getElementById('age').value),
            birthPlace: document.getElementById('birthPlace').value.trim(),
            photo: document.getElementById('photo').files[0]
        };
    }

    validateRegistrationData(data) {
        // Enhanced validation
        if (!data.firstName || data.firstName.length < 2) {
            this.showAlert('register-alert', 'First name must be at least 2 characters.', 'error');
            return false;
        }

        if (!data.lastName || data.lastName.length < 2) {
            this.showAlert('register-alert', 'Last name must be at least 2 characters.', 'error');
            return false;
        }

        if (!this.validateEmail(data.email)) {
            this.showAlert('register-alert', 'Please enter a valid email address.', 'error');
            return false;
        }

        if (!this.validatePhone(data.phone)) {
            this.showAlert('register-alert', 'Please enter a valid phone number.', 'error');
            return false;
        }

        if (data.age < 18 || data.age > 120) {
            this.showAlert('register-alert', 'Age must be between 18 and 120.', 'error');
            return false;
        }

        if (!data.photo) {
            this.showAlert('register-alert', 'Please upload a photo ID.', 'error');
            return false;
        }

        return true;
    }

    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    validatePhone(phone) {
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        return phoneRegex.test(phone.replace(/\s/g, ''));
    }

    validateUINFormat(uin) {
        // UIN should be a UUID format or similar
        const uinRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
        return uinRegex.test(uin) || uin.length >= 8;
    }

    async simulateRegistrationAPI(data) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Simulate success/failure
        if (Math.random() > 0.1) { // 90% success rate
            return {
                success: true,
                uin: this.generateUIN(),
                message: 'Registration successful'
            };
        } else {
            return {
                success: false,
                message: 'Email already registered or server error'
            };
        }
    }

    async simulateVotingAPI(uin, candidate) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Check if UIN exists in sample data
        const sampleUINs = [
            '550e8400-e29b-41d4-a716-446655440000',
            '650e8400-e29b-41d4-a716-446655440001',
            '750e8400-e29b-41d4-a716-446655440002',
            '850e8400-e29b-41d4-a716-446655440003',
            '950e8400-e29b-41d4-a716-446655440004'
        ];

        if (!sampleUINs.includes(uin)) {
            return {
                success: false,
                message: 'Invalid UIN. Please check your UIN or register first.'
            };
        }

        // Check if already voted (simulate)
        const votedUINs = JSON.parse(localStorage.getItem('votedUINs') || '[]');
        if (votedUINs.includes(uin)) {
            return {
                success: false,
                message: 'You have already voted. Multiple voting is not allowed.'
            };
        }

        // Record vote
        votedUINs.push(uin);
        localStorage.setItem('votedUINs', JSON.stringify(votedUINs));

        return {
            success: true,
            message: 'Vote recorded successfully',
            blockIndex: Math.floor(Math.random() * 1000) + 1
        };
    }

    async simulateBiometricVerification() {
        // Simulate biometric verification delay
        await new Promise(resolve => setTimeout(resolve, 3000));
    }

    generateUIN() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
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
        document.querySelector('#voting-form button[type="submit"]').disabled = true;
    }

    showLoading(formId) {
        const form = document.getElementById(formId);
        const button = form.querySelector('button[type="submit"]');
        const btnText = button.querySelector('.btn-text');
        const loading = button.querySelector('.loading');
        
        btnText.style.display = 'none';
        loading.style.display = 'flex';
        button.disabled = true;
    }

    hideLoading(formId) {
        const form = document.getElementById(formId);
        const button = form.querySelector('button[type="submit"]');
        const btnText = button.querySelector('.btn-text');
        const loading = button.querySelector('.loading');
        
        btnText.style.display = 'flex';
        loading.style.display = 'none';
        button.disabled = false;
    }

    showAlert(alertId, message, type) {
        const alert = document.getElementById(alertId);
        alert.textContent = message;
        alert.className = `alert alert-${type}`;
        alert.style.display = 'block';
        
        // Auto-hide success messages
        if (type === 'success') {
            setTimeout(() => this.hideAlert(alertId), 5000);
        }
    }

    hideAlert(alertId) {
        const alert = document.getElementById(alertId);
        alert.style.display = 'none';
    }
}

// Additional utility functions
function showResults() {
    window.open('/results', '_blank');
}

function showSampleUINs() {
    const sampleUINs = [
        { uin: '550e8400-e29b-41d4-a716-446655440000', name: 'Rahul Sharma' },
        { uin: '650e8400-e29b-41d4-a716-446655440001', name: 'Priya Patel' },
        { uin: '750e8400-e29b-41d4-a716-446655440002', name: 'Amit Kumar' },
        { uin: '850e8400-e29b-41d4-a716-446655440003', name: 'Sneha Reddy' },
        { uin: '950e8400-e29b-41d4-a716-446655440004', name: 'Rajesh Singh' }
    ];

    let content = 'Sample UINs for Testing:\n\n';
    sampleUINs.forEach(voter => {
        content += `${voter.name}: ${voter.uin}\n`;
    });
    
    alert(content);
}

function showBlockchain() {
    window.open('/chain', '_blank');
}

function closeModal() {
    document.getElementById('verification-modal').style.display = 'none';
}

// Initialize the system when page loads
document.addEventListener('DOMContentLoaded', () => {
    new SecureVotingSystem();
});

// Security enhancements
document.addEventListener('contextmenu', (e) => {
    e.preventDefault(); // Disable right-click
});

document.addEventListener('keydown', (e) => {
    // Disable F12, Ctrl+Shift+I, Ctrl+U
    if (e.key === 'F12' || 
        (e.ctrlKey && e.shiftKey && e.key === 'I') || 
        (e.ctrlKey && e.key === 'u')) {
        e.preventDefault();
    }
});

// Prevent drag and drop
document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', (e) => e.preventDefault());