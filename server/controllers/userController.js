const User = require('../models/User');

// @desc    Get current user profile
// @route   GET /api/users/me
const getProfile = async (req, res) => {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
};

// @desc    Update user profile
// @route   PUT /api/users/me
const updateProfile = async (req, res) => {
    // Whitelist fields to prevent mass assignment
    const allowed = {};
    const { displayName, currency, monthlyBudget, categories } = req.body;
    if (displayName !== undefined) allowed.displayName = displayName;
    if (currency !== undefined) allowed.currency = currency;
    if (monthlyBudget !== undefined) allowed.monthlyBudget = monthlyBudget;
    if (categories !== undefined) allowed.categories = categories;

    const user = await User.findByIdAndUpdate(
        req.user._id,
        allowed,
        { new: true, runValidators: true }
    );

    res.json({ success: true, data: user });
};

// @desc    Sync user from Firebase (called after login)
// @route   POST /api/users/sync
const syncUser = async (req, res) => {
    // User is already created/found by the auth middleware
    res.json({ success: true, data: req.user });
};

module.exports = { getProfile, updateProfile, syncUser };
