const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');
const SqliteStore = require('better-sqlite3-session-store')(session);
const db = require('../db');
const config = require('../config');

const findUserByGoogleId = db.prepare('SELECT * FROM users WHERE google_id = ?');
const findUserById = db.prepare('SELECT * FROM users WHERE id = ?');
const insertUser = db.prepare(
  'INSERT INTO users (google_id, email, display_name, avatar_url) VALUES (?, ?, ?, ?)'
);
const updateLastLogin = db.prepare(
  "UPDATE users SET last_login_at = datetime('now'), display_name = ?, avatar_url = ? WHERE id = ?"
);

function configurePassport(app) {
  app.use(session({
    store: new SqliteStore({
      client: db,
      expired: { clear: true, intervalMs: 900000 },
    }),
    secret: config.auth.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'lax',
    },
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser((id, done) => {
    try {
      const user = findUserById.get(id);
      done(null, user || false);
    } catch (err) {
      done(err);
    }
  });

  if (config.auth.googleClientId && config.auth.googleClientSecret) {
    passport.use(new GoogleStrategy(
      {
        clientID: config.auth.googleClientId,
        clientSecret: config.auth.googleClientSecret,
        callbackURL: config.auth.googleCallbackUrl,
      },
      (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value || '';
          const displayName = profile.displayName || email;
          const avatarUrl = profile.photos?.[0]?.value || '';

          if (config.auth.allowedDomain) {
            const domain = email.split('@')[1];
            if (domain !== config.auth.allowedDomain) {
              return done(null, false, {
                message: `Only @${config.auth.allowedDomain} accounts are allowed`,
              });
            }
          }

          let user = findUserByGoogleId.get(profile.id);
          if (user) {
            updateLastLogin.run(displayName, avatarUrl, user.id);
            user = findUserById.get(user.id);
          } else {
            const result = insertUser.run(profile.id, email, displayName, avatarUrl);
            user = findUserById.get(result.lastInsertRowid);
          }

          done(null, user);
        } catch (err) {
          done(err);
        }
      }
    ));
    console.log('[AUTH] Google OAuth strategy configured');
  } else {
    console.log('[AUTH] Google OAuth not configured — set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET');
  }
}

function requireAuth(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Authentication required' });
}

module.exports = { configurePassport, requireAuth };
