const User = require('../models/User');

// @desc    Get current user profile
// @route   GET /api/users/me
const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        res.json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update user profile
// @route   PUT /api/users/me
const updateProfile = async (req, res) => {
    try {
        const { displayName, currency, monthlyBudget, categories } = req.body;

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { displayName, currency, monthlyBudget, categories },
            { new: true, runValidators: true }
        );

        res.json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Sync user from Firebase (called after login)
// @route   POST /api/users/sync
const syncUser = async (req, res) => {
    try {
        // User is already created/found by the auth middleware
        res.json({ success: true, data: req.user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { getProfile, updateProfile, syncUser };
