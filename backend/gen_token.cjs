const jwt = require('jsonwebtoken'); const token = jwt.sign({ sub: 'cmtl4rgzt0000hkv3b1ykcuwr', email: 'test@example.com', role: 'ADMIN' }, 'access-secret-123456789'); console.log(token);
