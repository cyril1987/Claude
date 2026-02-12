const express = require('express');
const passport = require('passport');
const router = express.Router();

// Initiate Google OAuth
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Google OAuth callback
router.get('/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/#/login?error=auth_failed',
  }),
  (req, res) => {
    res.redirect('/#/');
  }
);

// Get current user info
router.get('/me', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      id: req.user.id,
      email: req.user.email,
      displayName: req.user.display_name,
      avatarUrl: req.user.avatar_url,
    });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.json({ success: true });
    });
  });
});

module.exports = router;
