
const {
    listar,
    buscar,
    collections
} = require('../services/firestore');

const { STATUS_ATIVOS } = require('../config/constants');

function gerarIniciais(nome) {
    const partes = (nome || '').trim().split(/\s+/);
    const primeira = partes[0] ? partes[0][0] : '';
    const ultima = partes.length > 1
        ? partes[partes.length - 1][0]
        : '';

    return (primeira + ultima).toUpperCase();
}

function pick(body) {
    return {
        nome: (body.nome || '').trim(),
        email: (body.email || '').trim().toLowerCase(),
        especialidade: (body.especialidade || '').trim() || null,
        ativo: body.ativo === 'on' || body.ativo === 'true'
    };
}

function validar(data, tecnicos, idAtual = null) {
    const erros = [];

    if (!data.nome) {
        erros.push('Informe o nome do técnico.');
    }

    if (data.nome.length > 100) {
        erros.push('O nome deve ter no máximo 100 caracteres.');
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        erros.push('Informe um e-mail válido.');
    }

    if (tecnicos.some(t =>
        t.email.toLowerCase() === data.email &&
        t.id !== idAtual
    )) {
        erros.push('Já existe um técnico com esse e-mail.');
    }

    return erros;
}

function renderForm(res, {
    tecnico,
    errors = [],
    isEdit,
    status = 200
}) {
    res.status(status).render('technicians/form', {
        title: isEdit ? 'Editar técnico' : 'Novo técnico',
        tecnico,
        errors,
        isEdit
    });
}

// GET /technicians
exports.index = async (req, res) => {
    const [lista, chamados] = await Promise.all([
        listar('technicians'),
        listar('tickets')
    ]);

    const tecnicos = lista.map(t => {
        const ticketsDoTecnico = chamados.filter(
            x => x.technicianId === t.id
        );

        return {
            id: t.id,
            nome: t.nome,
            email: t.email,
            especialidade: t.especialidade,
            ativo: t.ativo,
            iniciais: t.iniciais || gerarIniciais(t.nome),
            ativos: ticketsDoTecnico.filter(
                x => STATUS_ATIVOS.includes(x.status)
            ).length,
            concluidos: ticketsDoTecnico.filter(
                x => !STATUS_ATIVOS.includes(x.status)
            ).length
        };
    });

    tecnicos.sort((a, b) =>
        Number(b.ativo) - Number(a.ativo) ||
        a.nome.localeCompare(b.nome)
    );

    res.render('technicians/index', {
        title: 'Técnicos',
        tecnicos
    });
};

// GET /technicians/new
exports.new = (req, res) => {
    renderForm(res, {
        tecnico: { ativo: true },
        isEdit: false
    });
};

// POST /technicians
exports.create = async (req, res) => {
    const data = pick(req.body);
    const tecnicos = await listar('technicians');
    const errors = validar(data, tecnicos);

    if (errors.length) {
        return renderForm(res, {
            tecnico: data,
            errors,
            isEdit: false,
            status: 422
        });
    }

    const contadorRef = collections.technicians.firestore
        .collection('counters')
        .doc('technicians');

    const maiorExistente = tecnicos.reduce(
        (maior, t) => Math.max(maior, Number(t.id)),
        0
    );

    const id = await collections.technicians.firestore.runTransaction(
        async transaction => {
            const snapshot = await transaction.get(contadorRef);

            const ultimo = snapshot.exists
                ? Number(snapshot.data().lastId || 0)
                : 0;

            const novo = Math.max(ultimo, maiorExistente) + 1;

            transaction.set(contadorRef, { lastId: novo });

            return novo;
        }
    );

    const agora = new Date();

    await collections.technicians.doc(String(id)).set({
        ...data,
        id,
        iniciais: gerarIniciais(data.nome),
        createdAt: agora,
        updatedAt: agora
    });

    res.redirect(`/technicians?msg=${encodeURIComponent('Técnico cadastrado com sucesso!')}`);
};

// GET /technicians/:id/edit
exports.edit = async (req, res) => {
    const tecnico = await buscar('technicians', req.params.id);

    if (!tecnico) {
        return res.status(404).render('404', {
            title: 'Técnico não encontrado'
        });
    }

    renderForm(res, { tecnico, isEdit: true });
};

// PUT /technicians/:id
exports.update = async (req, res) => {
    const tecnico = await buscar('technicians', req.params.id);

    if (!tecnico) {
        return res.status(404).render('404', {
            title: 'Técnico não encontrado'
        });
    }

    const data = pick(req.body);
    const tecnicos = await listar('technicians');
    const errors = validar(data, tecnicos, tecnico.id);

    if (errors.length) {
        return renderForm(res, {
            tecnico: { ...tecnico, ...data },
            errors,
            isEdit: true,
            status: 422
        });
    }

    await collections.technicians.doc(String(tecnico.id)).update({
        ...data,
        iniciais: gerarIniciais(data.nome),
        updatedAt: new Date()
    });

    res.redirect(`/technicians?msg=${encodeURIComponent('Técnico atualizado.')}`);
};

// DELETE /technicians/:id
exports.destroy = async (req, res) => {
    const tecnico = await buscar('technicians', req.params.id);

    if (!tecnico) {
        return res.status(404).render('404', {
            title: 'Técnico não encontrado'
        });
    }

    const chamados = await listar('tickets');

    const batch = collections.technicians.firestore.batch();

    chamados
        .filter(t => t.technicianId === tecnico.id)
        .forEach(t => {
            batch.update(
                collections.technicians.firestore
                    .collection('tickets')
                    .doc(String(t.id)),
                {
                    technicianId: null,
                    updatedAt: new Date()
                }
            );
        });

    batch.delete(collections.technicians.doc(String(tecnico.id)));

    await batch.commit();

    res.redirect(`/technicians?msg=${encodeURIComponent('Técnico removido.')}`);
};