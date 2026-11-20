
const express = require('express');

const dashboard = require('../controllers/dashboardController');
const tickets = require('../controllers/ticketController');
const comments = require('../controllers/commentController');
const technicians = require('../controllers/technicianController');
const categories = require('../controllers/categoryController');

const { permitirRoles } = require('../middlewares/auth');

const router = express.Router();

// Dashboard
router.get('/', dashboard.index);

// Chamados
router.get('/tickets', tickets.index);
router.get('/tickets/new', tickets.new);
router.post('/tickets', tickets.create);
router.get('/tickets/:id', tickets.show);
router.post('/tickets/:id/comments', comments.create);

// Edição: técnico ou administrador
router.get('/tickets/:id/edit',
    permitirRoles('technician', 'admin'),
    tickets.edit
);

router.put('/tickets/:id',
    permitirRoles('technician', 'admin'),
    tickets.update
);

router.patch('/tickets/:id/quick',
    permitirRoles('technician', 'admin'),
    tickets.quickUpdate
);

// Exclusão: somente administrador
router.delete('/tickets/:id',
    permitirRoles('admin'),
    tickets.destroy
);

// Técnicos: somente administrador
router.get('/technicians',
    permitirRoles('admin'),
    technicians.index
);

router.get('/technicians/new',
    permitirRoles('admin'),
    technicians.new
);

router.post('/technicians',
    permitirRoles('admin'),
    technicians.create
);

router.get('/technicians/:id/edit',
    permitirRoles('admin'),
    technicians.edit
);

router.put('/technicians/:id',
    permitirRoles('admin'),
    technicians.update
);

router.delete('/technicians/:id',
    permitirRoles('admin'),
    technicians.destroy
);

// Categorias: somente administrador
router.get('/categories',
    permitirRoles('admin'),
    categories.index
);

router.get('/categories/new',
    permitirRoles('admin'),
    categories.new
);

router.post('/categories',
    permitirRoles('admin'),
    categories.create
);

router.get('/categories/:id/edit',
    permitirRoles('admin'),
    categories.edit
);

router.put('/categories/:id',
    permitirRoles('admin'),
    categories.update
);

router.delete('/categories/:id',
    permitirRoles('admin'),
    categories.destroy
);

module.exports = router;