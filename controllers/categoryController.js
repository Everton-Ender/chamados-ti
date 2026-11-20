
const {
    listar,
    buscar,
    collections
} = require('../services/firestore');

const { STATUS_ATIVOS } = require('../config/constants');

function pick(body) {
    return {
        nome: (body.nome || '').trim(),
        descricao: (body.descricao || '').trim() || null,
        cor: body.cor || '#6366f1'
    };
}

function validar(data, categorias, idAtual = null) {
    const erros = [];

    if (!data.nome) {
        erros.push('Informe o nome da categoria.');
    }

    if (data.nome.length > 80) {
        erros.push('O nome deve ter no máximo 80 caracteres.');
    }

    if (!/^#[0-9a-fA-F]{6}$/.test(data.cor)) {
        erros.push('Cor inválida.');
    }

    if (categorias.some(c =>
        c.nome.toLowerCase() === data.nome.toLowerCase() &&
        c.id !== idAtual
    )) {
        erros.push('Já existe uma categoria com esse nome.');
    }

    return erros;
}

function renderForm(res, {
    categoria,
    errors = [],
    isEdit,
    status = 200
}) {
    res.status(status).render('categories/form', {
        title: isEdit ? 'Editar categoria' : 'Nova categoria',
        categoria,
        errors,
        isEdit
    });
}

// GET /categories
exports.index = async (req, res) => {
    const [lista, chamados] = await Promise.all([
        listar('categories'),
        listar('tickets')
    ]);

    const categorias = lista
        .map(c => ({
            id: c.id,
            nome: c.nome,
            descricao: c.descricao,
            cor: c.cor,
            total: chamados.filter(t => t.categoryId === c.id).length,
            ativos: chamados.filter(t =>
                t.categoryId === c.id &&
                STATUS_ATIVOS.includes(t.status)
            ).length
        }))
        .sort((a, b) => a.nome.localeCompare(b.nome));

    res.render('categories/index', {
        title: 'Categorias',
        categorias
    });
};

// GET /categories/new
exports.new = (req, res) => {
    renderForm(res, {
        categoria: { cor: '#6366f1' },
        isEdit: false
    });
};

// POST /categories
exports.create = async (req, res) => {
    const data = pick(req.body);
    const categorias = await listar('categories');
    const errors = validar(data, categorias);

    if (errors.length) {
        return renderForm(res, {
            categoria: data,
            errors,
            isEdit: false,
            status: 422
        });
    }

    const id = await collections.categories.firestore
        .collection('counters')
        .doc('categories')
        .get()
        .then(async doc => {
            const ref = collections.categories.firestore
                .collection('counters')
                .doc('categories');

            return collections.categories.firestore.runTransaction(
                async transaction => {
                    const atual = await transaction.get(ref);
                    const maiorExistente = categorias.reduce(
                        (maior, c) => Math.max(maior, Number(c.id)),
                        0
                    );

                    const ultimo = atual.exists
                        ? Number(atual.data().lastId || 0)
                        : maiorExistente;

                    const novo = Math.max(ultimo, maiorExistente) + 1;

                    transaction.set(ref, { lastId: novo });
                    return novo;
                }
            );
        });

    const agora = new Date();

    await collections.categories.doc(String(id)).set({
        ...data,
        id,
        createdAt: agora,
        updatedAt: agora
    });

    res.redirect(`/categories?msg=${encodeURIComponent('Categoria criada com sucesso!')}`);
};

// GET /categories/:id/edit
exports.edit = async (req, res) => {
    const categoria = await buscar('categories', req.params.id);

    if (!categoria) {
        return res.status(404).render('404', {
            title: 'Categoria não encontrada'
        });
    }

    renderForm(res, { categoria, isEdit: true });
};

// PUT /categories/:id
exports.update = async (req, res) => {
    const categoria = await buscar('categories', req.params.id);

    if (!categoria) {
        return res.status(404).render('404', {
            title: 'Categoria não encontrada'
        });
    }

    const data = pick(req.body);
    const categorias = await listar('categories');
    const errors = validar(data, categorias, categoria.id);

    if (errors.length) {
        return renderForm(res, {
            categoria: { ...categoria, ...data },
            errors,
            isEdit: true,
            status: 422
        });
    }

    await collections.categories.doc(String(categoria.id)).update({
        ...data,
        updatedAt: new Date()
    });

    res.redirect(`/categories?msg=${encodeURIComponent('Categoria atualizada.')}`);
};

// DELETE /categories/:id
exports.destroy = async (req, res) => {
    const categoria = await buscar('categories', req.params.id);

    if (!categoria) {
        return res.status(404).render('404', {
            title: 'Categoria não encontrada'
        });
    }

    const chamados = await listar('tickets');

    const batch = collections.categories.firestore.batch();

    chamados
        .filter(t => t.categoryId === categoria.id)
        .forEach(t => {
            batch.update(
                collections.categories.firestore
                    .collection('tickets')
                    .doc(String(t.id)),
                {
                    categoryId: null,
                    updatedAt: new Date()
                }
            );
        });

    batch.delete(collections.categories.doc(String(categoria.id)));

    await batch.commit();

    res.redirect(`/categories?msg=${encodeURIComponent('Categoria removida.')}`);
};
