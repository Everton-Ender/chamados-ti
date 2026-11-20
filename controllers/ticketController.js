
const {
    collections,
    listar,
    buscar
} = require('../services/firestore');

const { proximoId } = require('../services/sequence');
const { STATUS, PRIORIDADES } = require('../config/constants');

function pickTicket(body) {
    return {
        titulo: (body.titulo || '').trim(),
        descricao: (body.descricao || '').trim(),
        solicitante: (body.solicitante || '').trim(),
        emailSolicitante: (body.emailSolicitante || '').trim() || null,
        setor: body.setor || null,
        prioridade: body.prioridade || 'media',
        status: body.status || 'aberto',
        categoryId: body.categoryId ? Number(body.categoryId) : null,
        technicianId: body.technicianId ? Number(body.technicianId) : null
    };
}

function validarTicket(data) {
    const erros = [];

    if (data.titulo.length < 3 || data.titulo.length > 150) {
        erros.push('O título deve ter entre 3 e 150 caracteres.');
    }

    if (!data.descricao) erros.push('Descreva o problema.');
    if (!data.solicitante) erros.push('Informe o nome do solicitante.');

    if (data.emailSolicitante &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.emailSolicitante)) {
        erros.push('E-mail do solicitante inválido.');
    }

    if (!STATUS[data.status]) erros.push('Status inválido.');
    if (!PRIORIDADES[data.prioridade]) erros.push('Prioridade inválida.');

    return erros;
}

async function formOptions() {
    const [categorias, tecnicos] = await Promise.all([
        listar('categories'),
        listar('technicians')
    ]);

    return {
        categorias: categorias.sort((a, b) => a.nome.localeCompare(b.nome)),
        tecnicos: tecnicos
            .filter(t => t.ativo)
            .sort((a, b) => a.nome.localeCompare(b.nome))
    };
}

async function enriquecerTicket(ticket) {
    if (!ticket) return null;

    const [categoria, tecnico] = await Promise.all([
        ticket.categoryId
            ? buscar('categories', ticket.categoryId)
            : null,
        ticket.technicianId
            ? buscar('technicians', ticket.technicianId)
            : null
    ]);

    return {
        ...ticket,
        protocolo: ticket.protocolo ||
            `CH-${String(ticket.id).padStart(5, '0')}`,
        categoria,
        tecnico
    };
}

async function adicionarComentario(ticketId, mensagem, autor = 'Sistema', tipo = 'sistema') {
    const referencia = collections.tickets
        .doc(String(ticketId))
        .collection('comentarios')
        .doc();

    await referencia.set({
        id: referencia.id,
        ticketId: Number(ticketId),
        autor,
        mensagem,
        tipo,
        createdAt: new Date(),
        updatedAt: new Date()
    });
}

async function obterComentarios(ticketId) {
    const snapshot = await collections.tickets
        .doc(String(ticketId))
        .collection('comentarios')
        .orderBy('createdAt', 'asc')
        .get();

    return snapshot.docs.map(doc => {
        const dados = doc.data();

        return {
            ...dados,
            id: dados.id || doc.id,
            createdAt: dados.createdAt?.toDate
                ? dados.createdAt.toDate()
                : dados.createdAt,
            updatedAt: dados.updatedAt?.toDate
                ? dados.updatedAt.toDate()
                : dados.updatedAt
        };
    });
}

async function findOr404(id, res) {
    const ticket = await buscar('tickets', id);

    if (!ticket) {
        res.status(404).render('404', {
            title: 'Chamado não encontrado'
        });
        return null;
    }

    return ticket;
}

// GET /tickets
exports.index = async (req, res) => {
    const { q, status, prioridade, categoria, tecnico } = req.query;

    let tickets = await listar('tickets');

    if (q) {
        const termo = q.toLowerCase();
        const idMatch = String(q).match(/^(?:CH-)?0*(\d+)$/i);
        const idBusca = idMatch ? Number(idMatch[1]) : null;

        tickets = tickets.filter(t =>
            (t.titulo || '').toLowerCase().includes(termo) ||
            (t.solicitante || '').toLowerCase().includes(termo) ||
            (t.descricao || '').toLowerCase().includes(termo) ||
            (idBusca !== null && t.id === idBusca)
        );
    }

    if (status === 'ativos') {
        tickets = tickets.filter(t =>
            ['aberto', 'em_andamento', 'aguardando'].includes(t.status)
        );
    } else if (status && STATUS[status]) {
        tickets = tickets.filter(t => t.status === status);
    }

    if (prioridade && PRIORIDADES[prioridade]) {
        tickets = tickets.filter(t => t.prioridade === prioridade);
    }

    if (categoria) {
        tickets = tickets.filter(t => String(t.categoryId) === categoria);
    }

    if (tecnico === 'nenhum') {
        tickets = tickets.filter(t => !t.technicianId);
    } else if (tecnico) {
        tickets = tickets.filter(t => String(t.technicianId) === tecnico);
    }

    tickets.sort((a, b) =>
        new Date(b.createdAt) - new Date(a.createdAt)
    );

    tickets = await Promise.all(tickets.map(enriquecerTicket));

    res.render('tickets/index', {
        title: 'Chamados',
        tickets,
        filtros: {
            q: q || '',
            status: status || '',
            prioridade: prioridade || '',
            categoria: categoria || '',
            tecnico: tecnico || ''
        },
        ...(await formOptions())
    });
};

// GET /tickets/new
exports.new = async (req, res) => {
    res.render('tickets/form', {
        title: 'Novo chamado',
        ticket: { prioridade: 'media', status: 'aberto' },
        errors: [],
        isEdit: false,
        ...(await formOptions())
    });
};

// POST /tickets
exports.create = async (req, res) => {
    const data = pickTicket(req.body);
    const errors = validarTicket(data);

    if (errors.length) {
        return res.status(422).render('tickets/form', {
            title: 'Novo chamado',
            ticket: data,
            errors,
            isEdit: false,
            ...(await formOptions())
        });
    }

    const id = await proximoId('tickets');
    const agora = new Date();

    const ticket = {
        ...data,
        id,
        protocolo: `CH-${String(id).padStart(5, '0')}`,
        resolvidoEm: ['resolvido', 'fechado'].includes(data.status)
            ? agora
            : null,
        createdAt: agora,
        updatedAt: agora
    };

    await collections.tickets.doc(String(id)).set(ticket);

    await adicionarComentario(
        id,
        `Chamado aberto por ${ticket.solicitante}.`
    );

    res.redirect(`/tickets/${id}?msg=${encodeURIComponent(
        `Chamado ${ticket.protocolo} criado com sucesso!`
    )}`);
};

// GET /tickets/:id
exports.show = async (req, res) => {
    const original = await findOr404(req.params.id, res);
    if (!original) return;

    const [ticket, comentarios, { tecnicos }] = await Promise.all([
        enriquecerTicket(original),
        obterComentarios(original.id),
        formOptions()
    ]);

    ticket.comentarios = comentarios;

    res.render('tickets/show', {
        title: ticket.protocolo,
        ticket,
        tecnicos,
        errors: []
    });
};

// GET /tickets/:id/edit
exports.edit = async (req, res) => {
    const original = await findOr404(req.params.id, res);
    if (!original) return;

    const ticket = await enriquecerTicket(original);

    res.render('tickets/form', {
        title: `Editar ${ticket.protocolo}`,
        ticket,
        errors: [],
        isEdit: true,
        ...(await formOptions())
    });
};

// PUT /tickets/:id
exports.update = async (req, res) => {
    const original = await findOr404(req.params.id, res);
    if (!original) return;

    const data = pickTicket(req.body);
    const errors = validarTicket(data);

    if (errors.length) {
        return res.status(422).render('tickets/form', {
            title: `Editar ${original.protocolo}`,
            ticket: {
                ...original,
                ...data,
                id: original.id,
                protocolo: original.protocolo
            },
            errors,
            isEdit: true,
            ...(await formOptions())
        });
    }

    const resolvidoEm = ['resolvido', 'fechado'].includes(data.status)
        ? (original.resolvidoEm || new Date())
        : null;

    await collections.tickets.doc(String(original.id)).update({
        ...data,
        resolvidoEm,
        updatedAt: new Date()
    });

    res.redirect(`/tickets/${original.id}?msg=${encodeURIComponent('Chamado atualizado.')}`);
};

// PATCH /tickets/:id/quick
exports.quickUpdate = async (req, res) => {
    const ticket = await findOr404(req.params.id, res);
    if (!ticket) return;

    const historico = [];
    const atualizacoes = {};

    const { status, prioridade } = req.body;
    const technicianId = req.body.technicianId
        ? Number(req.body.technicianId)
        : null;

    if (status && STATUS[status] && status !== ticket.status) {
        historico.push(
            `Status alterado de "${STATUS[ticket.status].label}" para "${STATUS[status].label}".`
        );
        atualizacoes.status = status;
        atualizacoes.resolvidoEm =
            ['resolvido', 'fechado'].includes(status)
                ? (ticket.resolvidoEm || new Date())
                : null;
    }

    if (prioridade && PRIORIDADES[prioridade] && prioridade !== ticket.prioridade) {
        historico.push(
            `Prioridade alterada de "${PRIORIDADES[ticket.prioridade].label}" para "${PRIORIDADES[prioridade].label}".`
        );
        atualizacoes.prioridade = prioridade;
    }

    if (technicianId !== (ticket.technicianId || null)) {
        const novo = technicianId
            ? await buscar('technicians', technicianId)
            : null;

        if (technicianId && !novo) {
            return res.redirect(`/tickets/${ticket.id}?erro=${encodeURIComponent('Técnico não encontrado.')}`);
        }

        historico.push(
            novo
                ? `Chamado atribuído a ${novo.nome}.`
                : 'Técnico responsável removido.'
        );

        atualizacoes.technicianId = novo ? novo.id : null;
    }

    if (!historico.length) {
        return res.redirect(`/tickets/${ticket.id}?erro=${encodeURIComponent('Nenhuma alteração realizada.')}`);
    }

    atualizacoes.updatedAt = new Date();

    await collections.tickets
        .doc(String(ticket.id))
        .update(atualizacoes);

    for (const mensagem of historico) {
        await adicionarComentario(ticket.id, mensagem);
    }

    res.redirect(`/tickets/${ticket.id}?msg=${encodeURIComponent('Chamado atualizado.')}`);
};

// DELETE /tickets/:id
exports.destroy = async (req, res) => {
    const ticket = await findOr404(req.params.id, res);
    if (!ticket) return;

    const comentarios = await collections.tickets
        .doc(String(ticket.id))
        .collection('comentarios')
        .get();

    const batch = collections.tickets.firestore.batch();

    comentarios.docs.forEach(doc => batch.delete(doc.ref));

    batch.delete(collections.tickets.doc(String(ticket.id)));

    await batch.commit();

    res.redirect(`/tickets?msg=${encodeURIComponent(
        `Chamado ${ticket.protocolo} excluído.`
    )}`);
};
