const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));

app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? 'https://yourdomain.com' : 'http://localhost:3000',
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs for auth endpoints
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
        this.miningReward = 1;
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
        // Enhanced vote validation
        if (!this.isValidVote(voterUIN, candidate)) {
            throw new Error('Invalid vote data');
        }

        const vote = {
            id: uuidv4(),
            voterUIN: this.hashVoterUIN(voterUIN), // Hash UIN for privacy
            candidate,
            timestamp,
            signature: this.signVote(voterUIN, candidate, timestamp)
        };

        this.currentVotes.push(vote);
        
        // Update candidate vote count
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
        // Check if UIN format is valid
        const uinRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
        if (!uinRegex.test(voterUIN) && voterUIN.length < 8) {
            return false;
        }

        // Check if candidate is valid
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

        // Proof of work
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
                hasVoted: false
            },
            {
                uin: '650e8400-e29b-41d4-a716-446655440001',
                firstName: 'Priya',
                lastName: 'Patel',
                email: 'priya.p@example.com',
                phone: '9876543211',
                age: 30,
                birthPlace: 'Delhi',
                hasVoted: false
            },
            {
                uin: '750e8400-e29b-41d4-a716-446655440002',
                firstName: 'Amit',
                lastName: 'Kumar',
                email: 'amit.k@example.com',
                phone: '9876543212',
                age: 28,
                birthPlace: 'Bangalore',
                hasVoted: false
            },
            {
                uin: '850e8400-e29b-41d4-a716-446655440003',
                firstName: 'Sneha',
                lastName: 'Reddy',
                email: 'sneha.r@example.com',
                phone: '9876543213',
                age: 35,
                birthPlace: 'Hyderabad',
                hasVoted: false
            },
            {
                uin: '950e8400-e29b-41d4-a716-446655440004',
                firstName: 'Rajesh',
                lastName: 'Singh',
                email: 'rajesh.s@example.com',
                phone: '9876543214',
                age: 45,
                birthPlace: 'Lucknow',
                hasVoted: false
            }
        ];

        sampleVoters.forEach(voter => {
            this.voters.set(voter.uin, voter);
        });
    }

    registerVoter(voterData) {
        const uin = uuidv4();
        const hashedPassword = bcrypt.hashSync(voterData.phone, 10); // Use phone as password for demo
        
        const voter = {
            uin,
            firstName: voterData.firstName,
            lastName: voterData.lastName,
            email: voterData.email,
            phone: voterData.phone,
            age: voterData.age,
            birthPlace: voterData.birthPlace,
            hashedPassword,
            hasVoted: false,
            registrationDate: new Date().toISOString(),
            photoPath: voterData.photoPath
        };

        this.voters.set(uin, voter);
        return uin;
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

// Middleware for request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip}`);
    next();
});

// API Routes

// Voter registration
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

        // Register voter
        const uin = voterSystem.registerVoter({
            firstName,
            lastName,
            email,
            phone,
            age: parseInt(age),
            birthPlace,
            photoPath: req.file.path
        });

        // In production, send email with UIN
        console.log(`New voter registered with UIN: ${uin}`);

        res.json({
            success: true,
            message: 'Registration successful! Your UIN has been sent to your email.',
            uin: uin // In production, don't send UIN in response
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// Vote casting
app.post('/api/vote', async (req, res) => {
    try {
        const { voterUIN, candidate } = req.body;

        // Validation
        if (!voterUIN || !candidate) {
            return res.status(400).json({ 
                success: false, 
                message: 'UIN and candidate selection are required' 
            });
        }

        // Check if voter exists
        if (!voterSystem.isValidVoter(voterUIN)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid UIN. Please check your UIN or register first.' 
            });
        }

        // Check if already voted
        if (voterSystem.hasVoted(voterUIN)) {
            return res.status(400).json({ 
                success: false, 
                message: 'You have already voted. Multiple voting is not allowed.' 
            });
        }

        // Add vote to blockchain
        const voteId = blockchain.addVote(voterUIN, candidate);
        
        // Mark voter as voted
        voterSystem.markAsVoted(voterUIN);

        // Mine block (in production, this would be done by miners)
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

// Get voter status
app.get('/api/voter/:uin', (req, res) => {
    try {
        const { uin } = req.params;
        
        if (!voterSystem.isValidVoter(uin)) {
            return res.status(404).json({ 
                success: false, 
                message: 'Voter not found' 
            });
        }

        const voter = voterSystem.getVoterDetails(uin);
        res.json({
            success: true,
            voter: {
                name: `${voter.firstName} ${voter.lastName}`,
                hasVoted: voterSystem.hasVoted(uin)
            }
        });
    } catch (error) {
        console.error('Voter status error:', error);
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

// Serve static files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Secure Voting System running on port ${PORT}`);
    console.log(`🔗 Blockchain initialized with ${blockchain.chain.length} blocks`);
    console.log(`👥 ${voterSystem.getAllVoters().length} sample voters loaded`);
    console.log(`🛡️  Security features enabled`);
});

module.exports = app;