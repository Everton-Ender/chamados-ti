
const { buscar, collections } = require('../services/firestore');

// POST /tickets/:id/comments
exports.create = async (req, res) => {
    const ticket = await buscar('tickets', req.params.id);

    if (!ticket) {
        return res.status(404).render('404', {
            title: 'Chamado não encontrado'
        });
    }

    const autor = (req.body.autor || '').trim();
    const mensagem = (req.body.mensagem || '').trim();

    if (!autor || !mensagem) {
        return res.redirect(
            `/tickets/${ticket.id}?erro=${encodeURIComponent(
                'Informe seu nome e escreva um comentário.'
            )}#comentarios`
        );
    }

    if (autor.length > 100 || mensagem.length > 5000) {
        return res.redirect(
            `/tickets/${ticket.id}?erro=${encodeURIComponent(
                'O nome ou comentário ultrapassa o limite permitido.'
            )}#comentarios`
        );
    }

    const referencia = collections.tickets
        .doc(String(ticket.id))
        .collection('comentarios')
        .doc();

    await referencia.set({
        id: referencia.id,
        ticketId: ticket.id,
        autor,
        mensagem,
        tipo: 'comentario',
        createdAt: new Date(),
        updatedAt: new Date()
    });

    res.redirect(
        `/tickets/${ticket.id}?msg=${encodeURIComponent(
            'Comentário adicionado.'
        )}#comentarios`
    );
};

