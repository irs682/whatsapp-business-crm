const { Router } = require('express');
const authController = require('./auth.controller');
const { registerSchema, loginSchema } = require('./auth.validation');
const validate = require('../../middleware/validate.middleware');
const authenticate = require('../../middleware/auth.middleware');
const { authRateLimiter } = require('../../middleware/rateLimiter.middleware');

const router = Router();

router.post('/register', authRateLimiter, validate(registerSchema), (req, res, next) => authController.register(req, res, next));
router.post('/login', authRateLimiter, validate(loginSchema), (req, res, next) => authController.login(req, res, next));
router.get('/me', authenticate, (req, res, next) => authController.me(req, res, next));

module.exports = router;
