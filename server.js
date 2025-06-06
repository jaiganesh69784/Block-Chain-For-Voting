const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

// Email configuration
const emailTransporter = nodemailer.createTransporter({
    service: 'gmail',
    auth: {
        user: 'your-email@gmail.com', // Replace with your email
        pass: 'your-app-password'     // Replace with your app password
    }
});

// Test email configuration on startup
emailTransporter.verify((error, success) => {
    if (error) {
        console.log('❌ Email configuration error:', error);
        console.log('📧 Please update email credentials in server.js');
    } else {
        console.log('✅ Email server is ready');
    }
});

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            mediaSrc: ["'self'", "blob:"],
        },
    },
}));

app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? 'https://yourdomain.com' : true,
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again later.',
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many authentication attempts, please try again later.',
});

app.use(limiter);
app.use('/api/auth', authLimiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static('.'));

// File upload configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/voter_photos';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// Enhanced Blockchain implementation
class SecureBlockchain {
    constructor() {
        this.chain = [];
        this.currentVotes = [];
        this.candidateVotes = {};
        this.difficulty = 4;
        this.createGenesisBlock();
    }

    createGenesisBlock() {
        const genesisBlock = {
            index: 0,
            timestamp: Date.now(),
            votes: [],
            previousHash: '0',
            hash: this.calculateHash(0, Date.now(), [], '0', 0),
            nonce: 0
        };
        this.chain.push(genesisBlock);
    }

    calculateHash(index, timestamp, votes, previousHash, nonce) {
        return crypto
            .createHash('sha256')
            .update(index + timestamp + JSON.stringify(votes) + previousHash + nonce)
            .digest('hex');
    }

    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }

    addVote(voterUIN, candidate, timestamp = Date.now()) {
        if (!this.isValidVote(voterUIN, candidate)) {
            throw new Error('Invalid vote data');
        }

        const vote = {
            id: uuidv4(),
            voterUIN: this.hashVoterUIN(voterUIN),
            candidate,
            timestamp,
            signature: this.signVote(voterUIN, candidate, timestamp)
        };

        this.currentVotes.push(vote);
        this.candidateVotes[candidate] = (this.candidateVotes[candidate] || 0) + 1;

        return vote.id;
    }

    hashVoterUIN(uin) {
        return crypto.createHash('sha256').update(uin + 'salt_secret').digest('hex');
    }

    signVote(voterUIN, candidate, timestamp) {
        const data = voterUIN + candidate + timestamp;
        return crypto.createHash('sha256').update(data + 'signature_secret').digest('hex');
    }

    isValidVote(voterUIN, candidate) {
        const uinRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
        if (!uinRegex.test(voterUIN) && voterUIN.length < 8) {
            return false;
        }

        const validCandidates = [
            'Narendra Modi', 'Rahul Gandhi', 'Mamata Banerjee', 'Arvind Kejriwal',
            'M.K. Stalin', 'Nitish Kumar', 'Akhilesh Yadav', 'Uddhav Thackeray'
        ];
        
        return validCandidates.includes(candidate);
    }

    mineBlock() {
        const latestBlock = this.getLatestBlock();
        const newBlock = {
            index: latestBlock.index + 1,
            timestamp: Date.now(),
            votes: [...this.currentVotes],
            previousHash: latestBlock.hash,
            nonce: 0
        };

        while (newBlock.hash === undefined || !newBlock.hash.startsWith('0'.repeat(this.difficulty))) {
            newBlock.nonce++;
            newBlock.hash = this.calculateHash(
                newBlock.index,
                newBlock.timestamp,
                newBlock.votes,
                newBlock.previousHash,
                newBlock.nonce
            );
        }

        this.chain.push(newBlock);
        this.currentVotes = [];
        return newBlock;
    }

    isChainValid() {
        for (let i = 1; i < this.chain.length; i++) {
            const currentBlock = this.chain[i];
            const previousBlock = this.chain[i - 1];

            if (currentBlock.hash !== this.calculateHash(
                currentBlock.index,
                currentBlock.timestamp,
                currentBlock.votes,
                currentBlock.previousHash,
                currentBlock.nonce
            )) {
                return false;
            }

            if (currentBlock.previousHash !== previousBlock.hash) {
                return false;
            }
        }
        return true;
    }

    getResults() {
        return Object.entries(this.candidateVotes)
            .map(([candidate, votes]) => ({ candidate, votes }))
            .sort((a, b) => b.votes - a.votes);
    }

    getWinner() {
        const results = this.getResults();
        return results.length > 0 ? results[0] : null;
    }
}

// Enhanced Voter management
class SecureVoterSystem {
    constructor() {
        this.voters = new Map();
        this.votedUINs = new Set();
        this.loadSampleVoters();
    }

    loadSampleVoters() {
        const sampleVoters = [
            {
                uin: '550e8400-e29b-41d4-a716-446655440000',
                firstName: 'Rahul',
                lastName: 'Sharma',
                email: 'rahul.s@example.com',
                phone: '9876543210',
                age: 25,
                birthPlace: 'Mumbai',
                hasVoted: false,
                photoPath: 'sample_photo.jpg'
            },
            {
                uin: '650e8400-e29b-41d4-a716-446655440001',
                firstName: 'Priya',
                lastName: 'Patel',
                email: 'priya.p@example.com',
                phone: '9876543211',
                age: 30,
                birthPlace: 'Delhi',
                hasVoted: false,
                photoPath: 'sample_photo.jpg'
            },
            {
                uin: '750e8400-e29b-41d4-a716-446655440002',
                firstName: 'Amit',
                lastName: 'Kumar',
                email: 'amit.k@example.com',
                phone: '9876543212',
                age: 28,
                birthPlace: 'Bangalore',
                hasVoted: false,
                photoPath: 'sample_photo.jpg'
            }
        ];

        sampleVoters.forEach(voter => {
            this.voters.set(voter.uin, voter);
        });
    }

    async registerVoter(voterData) {
        const uin = uuidv4();
        
        const voter = {
            uin,
            firstName: voterData.firstName,
            lastName: voterData.lastName,
            email: voterData.email,
            phone: voterData.phone,
            age: voterData.age,
            birthPlace: voterData.birthPlace,
            hasVoted: false,
            registrationDate: new Date().toISOString(),
            photoPath: voterData.photoPath,
            biometricData: voterData.biometricData
        };

        this.voters.set(uin, voter);
        
        // Send UIN via email
        await this.sendUINEmail(voter.email, uin, voter);
        
        return uin;
    }

    async sendUINEmail(email, uin, voter) {
        const mailOptions = {
            from: 'your-email@gmail.com',
            to: email,
            subject: 'Your Voter Registration - UIN Card',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f5f5f5; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h1 style="margin: 0; font-size: 28px;">🗳️ SecureVote</h1>
                        <p style="margin: 10px 0 0 0; font-size: 16px;">Blockchain Voting System</p>
                    </div>
                    
                    <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        <h2 style="color: #333; margin-top: 0;">Registration Successful! 🎉</h2>
                        
                        <div style="background: #f8f9fa; border-left: 4px solid #28a745; padding: 20px; margin: 20px 0; border-radius: 5px;">
                            <h3 style="color: #28a745; margin-top: 0;">Your Digital Voter ID Card</h3>
                            
                            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; margin: 15px 0;">
                                <div style="display: flex; align-items: center; justify-content: space-between;">
                                    <div>
                                        <h4 style="margin: 0; font-size: 18px;">${voter.firstName} ${voter.lastName}</h4>
                                        <p style="margin: 5px 0; opacity: 0.9;">Registered Voter</p>
                                        <p style="margin: 5px 0; font-size: 14px; opacity: 0.8;">Age: ${voter.age} | ${voter.birthPlace}</p>
                                    </div>
                                    <div style="background: white; color: #333; padding: 10px; border-radius: 5px; text-align: center;">
                                        <div style="font-size: 12px; font-weight: bold;">UIN</div>
                                        <div style="font-family: monospace; font-size: 10px; word-break: break-all;">${uin}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
                            <h4 style="color: #856404; margin-top: 0;">🔐 Important Security Information</h4>
                            <ul style="color: #856404; margin: 0; padding-left: 20px;">
                                <li>Keep your UIN confidential and secure</li>
                                <li>You will need this UIN to cast your vote</li>
                                <li>Biometric verification will be required during voting</li>
                                <li>Do not share your UIN with anyone</li>
                            </ul>
                        </div>
                        
                        <div style="text-align: center; margin-top: 30px;">
                            <p style="color: #666; font-size: 14px;">
                                Registration Date: ${new Date().toLocaleDateString()}<br>
                                Email: ${email}
                            </p>
                        </div>
                        
                        <div style="background: #e3f2fd; padding: 15px; border-radius: 5px; margin-top: 20px; text-align: center;">
                            <p style="color: #1976d2; margin: 0; font-weight: bold;">Ready to Vote? 🗳️</p>
                            <p style="color: #1976d2; margin: 5px 0 0 0; font-size: 14px;">Use your UIN and biometric verification to cast your secure vote</p>
                        </div>
                    </div>
                    
                    <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
                        <p>This is an automated message from SecureVote Blockchain Voting System</p>
                        <p>© 2024 SecureVote. All rights reserved.</p>
                    </div>
                </div>
            `
        };

        try {
            await emailTransporter.sendMail(mailOptions);
            console.log(`✅ UIN email sent successfully to ${email}`);
            return true;
        } catch (error) {
            console.error('❌ Error sending email:', error);
            throw new Error('Failed to send UIN email');
        }
    }

    isValidVoter(uin) {
        return this.voters.has(uin);
    }

    hasVoted(uin) {
        const voter = this.voters.get(uin);
        return voter ? voter.hasVoted || this.votedUINs.has(uin) : false;
    }

    markAsVoted(uin) {
        if (this.voters.has(uin)) {
            this.voters.get(uin).hasVoted = true;
            this.votedUINs.add(uin);
        }
    }

    getVoterDetails(uin) {
        return this.voters.get(uin);
    }

    getAllVoters() {
        return Array.from(this.voters.values()).map(voter => ({
            uin: voter.uin,
            name: `${voter.firstName} ${voter.lastName}`,
            email: voter.email,
            hasVoted: voter.hasVoted || this.votedUINs.has(voter.uin)
        }));
    }
}

// Initialize systems
const blockchain = new SecureBlockchain();
const voterSystem = new SecureVoterSystem();

// Biometric verification simulation
function simulateBiometricVerification(uploadedPhoto, capturedPhoto) {
    // In a real implementation, this would use face recognition APIs
    // For demo purposes, we'll simulate a successful match
    return new Promise((resolve) => {
        setTimeout(() => {
            // Simulate 90% success rate for demo
            const isMatch = Math.random() > 0.1;
            resolve({
                success: isMatch,
                confidence: isMatch ? (0.85 + Math.random() * 0.14) : (0.3 + Math.random() * 0.4),
                message: isMatch ? 'Biometric verification successful' : 'Biometric verification failed'
            });
        }, 2000);
    });
}

// API Routes

// Voter registration with biometric verification
app.post('/api/register', upload.single('photo'), async (req, res) => {
    try {
        const { firstName, lastName, email, phone, age, birthPlace } = req.body;

        // Validation
        if (!firstName || !lastName || !email || !phone || !age || !birthPlace) {
            return res.status(400).json({ 
                success: false, 
                message: 'All fields are required' 
            });
        }

        if (parseInt(age) < 18) {
            return res.status(400).json({ 
                success: false, 
                message: 'Must be 18 or older to register' 
            });
        }

        if (!req.file) {
            return res.status(400).json({ 
                success: false, 
                message: 'Photo ID is required' 
            });
        }

        // Simulate biometric analysis of uploaded photo
        const biometricAnalysis = await simulateBiometricVerification(req.file.path, null);
        
        if (!biometricAnalysis.success) {
            // Delete uploaded file if biometric verification fails
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ 
                success: false, 
                message: 'Photo verification failed. Please upload a clear photo of your face.' 
            });
        }

        // Register voter
        const uin = await voterSystem.registerVoter({
            firstName,
            lastName,
            email,
            phone,
            age: parseInt(age),
            birthPlace,
            photoPath: req.file.path,
            biometricData: biometricAnalysis
        });

        res.json({
            success: true,
            message: 'Registration successful! Your UIN has been sent to your email.',
            uin: uin
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Internal server error' 
        });
    }
});

// Biometric verification for voting
app.post('/api/verify-biometric', async (req, res) => {
    try {
        const { voterUIN, capturedImage } = req.body;

        if (!voterUIN || !capturedImage) {
            return res.status(400).json({ 
                success: false, 
                message: 'UIN and captured image are required' 
            });
        }

        // Check if voter exists
        if (!voterSystem.isValidVoter(voterUIN)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid UIN' 
            });
        }

        const voter = voterSystem.getVoterDetails(voterUIN);
        
        // Simulate biometric comparison
        const verification = await simulateBiometricVerification(voter.photoPath, capturedImage);
        
        res.json({
            success: verification.success,
            confidence: verification.confidence,
            message: verification.message,
            voterName: verification.success ? `${voter.firstName} ${voter.lastName}` : null
        });

    } catch (error) {
        console.error('Biometric verification error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// Vote casting with biometric verification
app.post('/api/vote', async (req, res) => {
    try {
        const { voterUIN, candidate, biometricVerified } = req.body;

        if (!voterUIN || !candidate) {
            return res.status(400).json({ 
                success: false, 
                message: 'UIN and candidate selection are required' 
            });
        }

        if (!biometricVerified) {
            return res.status(400).json({ 
                success: false, 
                message: 'Biometric verification required' 
            });
        }

        // Check if voter exists
        if (!voterSystem.isValidVoter(voterUIN)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid UIN' 
            });
        }

        // Check if already voted
        if (voterSystem.hasVoted(voterUIN)) {
            return res.status(400).json({ 
                success: false, 
                message: 'You have already voted' 
            });
        }

        // Add vote to blockchain
        const voteId = blockchain.addVote(voterUIN, candidate);
        
        // Mark voter as voted
        voterSystem.markAsVoted(voterUIN);

        // Mine block
        const newBlock = blockchain.mineBlock();

        res.json({
            success: true,
            message: 'Vote cast successfully!',
            voteId,
            blockIndex: newBlock.index,
            blockHash: newBlock.hash
        });

    } catch (error) {
        console.error('Voting error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Internal server error' 
        });
    }
});

// Get election results
app.get('/api/results', (req, res) => {
    try {
        const results = blockchain.getResults();
        const totalVotes = results.reduce((sum, result) => sum + result.votes, 0);
        
        const resultsWithPercentage = results.map(result => ({
            ...result,
            percentage: totalVotes > 0 ? ((result.votes / totalVotes) * 100).toFixed(2) : 0
        }));

        res.json({
            success: true,
            results: resultsWithPercentage,
            totalVotes,
            winner: blockchain.getWinner()
        });
    } catch (error) {
        console.error('Results error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// Get blockchain data
app.get('/api/blockchain', (req, res) => {
    try {
        res.json({
            success: true,
            chain: blockchain.chain,
            length: blockchain.chain.length,
            isValid: blockchain.isChainValid()
        });
    } catch (error) {
        console.error('Blockchain error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// Get sample UINs for testing
app.get('/api/sample-uins', (req, res) => {
    try {
        const voters = voterSystem.getAllVoters();
        res.json({
            success: true,
            voters
        });
    } catch (error) {
        console.error('Sample UINs error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        blockchain: {
            blocks: blockchain.chain.length,
            isValid: blockchain.isChainValid()
        }
    });
});

// Serve static files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Error:', error);
    
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ 
                success: false, 
                message: 'File too large. Maximum size is 5MB.' 
            });
        }
    }
    
    res.status(500).json({ 
        success: false, 
        message: 'Internal server error' 
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Secure Voting System running on port ${PORT}`);
    console.log(`🔗 Blockchain initialized with ${blockchain.chain.length} blocks`);
    console.log(`👥 ${voterSystem.getAllVoters().length} sample voters loaded`);
    console.log(`🛡️  Security features enabled`);
    console.log(`📧 Email service configured`);
});

module.exports = app;