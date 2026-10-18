const fs = require('fs');
const path = require('path');

const placeholderModules = [
  { name: 'roles', singular: 'role' },
  { name: 'permissions', singular: 'permission' },
  { name: 'conversations', singular: 'conversation' },
  { name: 'messages', singular: 'message' },
  { name: 'notes', singular: 'note' },
  { name: 'tasks', singular: 'task' },
  { name: 'campaigns', singular: 'campaign' },
  { name: 'templates', singular: 'template' },
  { name: 'consent', singular: 'consent' },
  { name: 'reports', singular: 'report' },
  { name: 'audit', singular: 'audit' },
  { name: 'notifications', singular: 'notification' },
  { name: 'whatsapp', singular: 'whatsapp' },
];

const baseDir = path.resolve(__dirname, '../server/src/modules');

placeholderModules.forEach(({ name, singular }) => {
  const modDir = path.join(baseDir, name);
  if (!fs.existsSync(modDir)) {
    fs.mkdirSync(modDir, { recursive: true });
  }

  // 1. Constants
  fs.writeFileSync(
    path.join(modDir, `${singular}.constants.js`),
    `const ${singular.toUpperCase()}_CONSTANTS = {
  MODULE_NAME: '${name}',
};

module.exports = ${singular.toUpperCase()}_CONSTANTS;
`
  );

  // 2. Validation
  fs.writeFileSync(
    path.join(modDir, `${singular}.validation.js`),
    `const { z } = require('zod');

const ${singular}QuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
});

module.exports = {
  ${singular}QuerySchema,
};
`
  );

  // 3. Repository
  fs.writeFileSync(
    path.join(modDir, `${singular}.repository.js`),
    `const prisma = require('../../config/prisma');

class ${capitalize(singular)}Repository {
  async findAll() {
    // Placeholder repository implementation for ${name}
    return [];
  }

  async findById(id) {
    return null;
  }
}

module.exports = new ${capitalize(singular)}Repository();
`
  );

  // 4. Service
  fs.writeFileSync(
    path.join(modDir, `${singular}.service.js`),
    `const ${singular}Repository = require('./${singular}.repository');

class ${capitalize(singular)}Service {
  async list(query = {}) {
    // TODO: Follow SRS/Proposal specifications for ${name} business logic
    return {
      items: await ${singular}Repository.findAll(),
      message: 'Module ${name} placeholder response - scheduled for Phase roadmap',
    };
  }
}

module.exports = new ${capitalize(singular)}Service();
`
  );

  // 5. Controller
  fs.writeFileSync(
    path.join(modDir, `${singular}.controller.js`),
    `const ${singular}Service = require('./${singular}.service');
const ApiResponse = require('../../utils/apiResponse');

class ${capitalize(singular)}Controller {
  async list(req, res, next) {
    try {
      const data = await ${singular}Service.list(req.query);
      return ApiResponse.success(res, '${capitalize(name)} placeholder list', data);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ${capitalize(singular)}Controller();
`
  );

  // 6. Routes
  fs.writeFileSync(
    path.join(modDir, `${singular}.routes.js`),
    `const { Router } = require('express');
const ${singular}Controller = require('./${singular}.controller');
const authenticate = require('../../middleware/auth.middleware');

const router = Router();

router.use(authenticate);

router.get('/', (req, res, next) => ${singular}Controller.list(req, res, next));

module.exports = router;
`
  );

  console.log(`✅ Generated modular placeholder for: ${name}`);
});

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
