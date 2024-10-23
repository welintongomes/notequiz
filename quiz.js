let db;
let score = 0;
let questions = [];
let currentQuestion = null;
let usedQuestions = []; // Array para rastrear perguntas já usadas
let categorias = []; // Array para armazenar categorias
let currentCategory = ""; // Armazena a categoria atual
let tempo; // Para armazenar o tempo limite
let timer; // Para gerenciar o temporizador

//gera uma cor aleatória com um intervalo para a cor nao ser muito clara nen muito escura
function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color;

    do {
        color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
    } while (!isContrastedColor(color));

    return color;
}

function isContrastedColor(color) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);

    // Calcula a luminância
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b);

    // Ajuste os limites para evitar cores muito claras e muito escuras
    return luminance > 80 && luminance < 200; // Ajuste os limites conforme necessário
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}
const request = indexedDB.open("quizDB", 1);

request.onupgradeneeded = function (event) {
    db = event.target.result;
    db.createObjectStore("questions", { keyPath: "id", autoIncrement: true });
    db.createObjectStore("score", { keyPath: "id" });
};

request.onsuccess = function (event) {
    db = event.target.result;
    loadQuestions();
    loadScore();
    loadCategorias(); // Carrega as categorias no início
};

function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
    });
    document.getElementById(tabName).style.display = 'block';
}

function addQuestion() {
    const pergunta = document.getElementById("pergunta").value;
    const respostas = Array.from(document.querySelectorAll('.resposta')).map(input => input.value);
    const respostaCorreta = document.getElementById("resposta-correta").value.toUpperCase();
    const categoria = document.getElementById("categoria").value;
    const descricaoRespostas = Array.from(document.querySelectorAll('.descricao')).map(input => input.value);

    if (pergunta && respostas.every(r => r) && ["A", "B", "C", "D"].includes(respostaCorreta) && categoria && descricaoRespostas.length === 4) {
        const transaction = db.transaction(["questions"], "readwrite");
        const store = transaction.objectStore("questions");
        store.add({ pergunta, respostas, respostaCorreta, categoria, descricaoRespostas });

        // Adiciona a categoria ao array
        if (!categorias.includes(categoria)) {
            categorias.push(categoria);

            // Atualiza o dropdown de categorias
            const categoriaSelect = document.getElementById("categoria-quiz");
            const option = document.createElement("option");
            option.value = categoria;
            option.textContent = categoria;
            categoriaSelect.appendChild(option);
        }

        clearInputFields();
        loadQuestions();
        updateDatalist(); // Atualiza o datalist após adicionar a pergunta
    } else {
        alertaErro();
        showModalMessage("Preencha todos os campos corretamente!");
    }
}

function clearInputFields() {
    document.getElementById("pergunta").value = '';
    document.querySelectorAll('.resposta').forEach(input => input.value = '');
    document.getElementById("resposta-correta").value = '';
    document.getElementById("categoria").value = '';
}

function loadQuestions() {
    const transaction = db.transaction(["questions"], "readonly");
    const store = transaction.objectStore("questions");
    const request = store.getAll();

    request.onsuccess = function (event) {
        questions = event.target.result;
        usedQuestions = []; // Reinicia o array de perguntas usadas
        const lista = document.getElementById("lista-perguntas");
        lista.innerHTML = '';

        questions.forEach(question => {
            const li = document.createElement("li");
            li.className = "list-group-item"; // Adiciona a classe para estilo

            // Cria um contêiner para os botões
            const buttonContainer = document.createElement("div");
            buttonContainer.className = "button-group"; // Adiciona uma classe para estilo
            buttonContainer.style.marginLeft = "10px"; // Margem para separar os botões

            const editButton = document.createElement("button");
            editButton.textContent = "Editar";
            editButton.className = "btn btn-warning btn-sm"; // Classe para botão estilizado
            editButton.onclick = () => editQuestion(question.id);

            const deleteButton = document.createElement("button");
            deleteButton.textContent = "Excluir";
            deleteButton.className = "btn btn-danger btn-sm"; // Classe para botão estilizado
            deleteButton.onclick = () => deleteQuestion(question.id);

            // Adiciona os botões ao contêiner
            buttonContainer.appendChild(editButton);
            buttonContainer.appendChild(deleteButton);

            // Cria um elemento para a pergunta
            const questionText = document.createElement("span");
            questionText.className = "question-text"; // Adiciona a classe para estilo
            questionText.textContent = question.pergunta; // Mostra apenas a pergunta
            //para voltar a mostrar todos os itens da pergunta descomente a linha de baixo e comente a linha de cima
            //questionText.textContent = `${question.pergunta} - Respostas: ${question.respostas.join(", ")} - Categoria: ${question.categoria} - Descrições: ${question.descricaoRespostas.join(", ")}`;
            // Adiciona o contêiner e a pergunta ao item da lista
            li.appendChild(questionText);
            li.appendChild(buttonContainer);

            lista.appendChild(li);
        });

    };
}

function editQuestion(id) {
    const question = questions.find(q => q.id === id);
    if (question) {
        document.getElementById("pergunta").value = question.pergunta;
        const respostaInputs = document.querySelectorAll('.resposta');
        respostaInputs.forEach((input, index) => {
            input.value = question.respostas[index];
        });
        document.getElementById("resposta-correta").value = question.respostaCorreta;
        document.getElementById("categoria").value = question.categoria;

        // Preenche os campos de descrição
        const descricaoInputs = document.querySelectorAll('.descricao'); // Se você tiver um seletor para as descrições
        descricaoInputs.forEach((input, index) => {
            input.value = question.descricaoRespostas[index];
        });

        // Atualiza o botão de adicionar para editar
        const addButton = document.getElementById("add-button");
        addButton.textContent = "Salvar Edição";
        addButton.onclick = () => saveEdit(id);
    }
}

function saveEdit(id) {
    const pergunta = document.getElementById("pergunta").value;
    const respostas = Array.from(document.querySelectorAll('.resposta')).map(input => input.value);
    const respostaCorreta = document.getElementById("resposta-correta").value.toUpperCase();
    const categoria = document.getElementById("categoria").value;
    const descricaoRespostas = Array.from(document.querySelectorAll('.descricao')).map(input => input.value); // Coleta as descrições

    // Verifica se todos os campos estão preenchidos corretamente
    if (pergunta && respostas.every(r => r) && ["A", "B", "C", "D"].includes(respostaCorreta) && categoria && descricaoRespostas.length === 4) {
        const transaction = db.transaction(["questions"], "readwrite");
        const store = transaction.objectStore("questions");
        store.put({ id, pergunta, respostas, respostaCorreta, categoria, descricaoRespostas }); // Salva as descrições

        clearInputFields();
        loadQuestions();

        const addButton = document.getElementById("add-button");
        addButton.textContent = "Adicionar Pergunta";
        addButton.onclick = addQuestion;
    } else {
        alertaErro();
        showModalMessage("Preencha todos os campos corretamente!");
    }
}

function deleteQuestion(id) {
    if (confirm("Você tem certeza que deseja excluir esta pergunta?")) {
        const transaction = db.transaction(["questions"], "readwrite");
        const store = transaction.objectStore("questions");
        store.delete(id);
        loadQuestions();
    }
}

function deleteAllQuestions() {
    if (confirm("Você tem certeza que deseja excluir todas as perguntas?")) {
        const transaction = db.transaction(["questions"], "readwrite");
        const store = transaction.objectStore("questions");
        store.clear().onsuccess = function () {
            loadQuestions(); // Recarrega a lista de perguntas
            loadCategorias(); // Atualiza as categorias
            alertaSucesso();
            showModalMessage("Todas as perguntas foram excluídas.",'alert');
        };
    }
}

function loadCategorias() {
    const transaction = db.transaction(["questions"], "readonly");
    const store = transaction.objectStore("questions");
    const request = store.getAll();

    request.onsuccess = function (event) {
        const todasAsPerguntas = event.target.result;
        categorias = []; // Limpa o array de categorias

        todasAsPerguntas.forEach(question => {
            if (!categorias.includes(question.categoria)) {
                categorias.push(question.categoria);
            }
        });

        updateDatalist(); // Atualiza o datalist com as categorias
        populateCategoryDropdown(); // Adiciona categorias ao dropdown das perguntas
        populateQuizCategoryDropdown(); // Preenche o dropdown do quiz
    };
}

function populateQuizCategoryDropdown() {
    const categoriaSelect = document.getElementById("categoria-quiz");
    categoriaSelect.innerHTML = '<option value="">Selecione uma categoria</option>'; // Limpa as opções

    categorias.forEach(categoria => {
        const option = document.createElement("option");
        option.value = categoria;
        option.textContent = categoria;
        categoriaSelect.appendChild(option);
    });
}

function populateCategoryDropdown() {
    const categoriaSelect = document.getElementById("categoria-select");
    categoriaSelect.innerHTML = '<option value="">Todas, ou selecione alguma Categoria</option>'; // Texto alterado

    categorias.forEach(categoria => {
        const option = document.createElement("option");
        option.value = categoria;
        option.textContent = categoria;
        categoriaSelect.appendChild(option);
    });

    // Limpa a lista de perguntas quando o dropdown é populado
    const lista = document.getElementById("lista-perguntas");
    lista.innerHTML = ''; // Garante que a lista comece vazia
}

function filterQuestionsByCategory() {
    const selectedCategory = document.getElementById("categoria-select").value;

    if (selectedCategory) {
        const filteredQuestions = questions.filter(q => q.categoria === selectedCategory);
        loadFilteredQuestions(filteredQuestions);
    } else {
        loadQuestions(); // Se nenhuma categoria for selecionada, carrega todas as perguntas
    }
}

function loadFilteredQuestions(filteredQuestions) {
    const lista = document.getElementById("lista-perguntas");
    lista.innerHTML = ''; // Limpa a lista a cada nova seleção

    if (filteredQuestions.length === 0) {
        const noQuestionsMessage = document.createElement("li");
        noQuestionsMessage.className = "list-group-item";
        noQuestionsMessage.textContent = "Nenhuma pergunta encontrada para esta categoria.";
        lista.appendChild(noQuestionsMessage);
        return; // Saia da função se não houver perguntas
    }

    filteredQuestions.forEach(question => {
        const li = document.createElement("li");
        li.className = "list-group-item";

        const buttonContainer = document.createElement("div");
        buttonContainer.className = "button-group";

        const editButton = document.createElement("button");
        editButton.textContent = "Editar";
        editButton.className = "btn btn-warning btn-sm";
        editButton.onclick = () => editQuestion(question.id);

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Excluir";
        deleteButton.className = "btn btn-danger btn-sm";
        deleteButton.onclick = () => deleteQuestion(question.id);

        buttonContainer.appendChild(editButton);
        buttonContainer.appendChild(deleteButton);

        const questionText = document.createElement("span");
        questionText.className = "question-text";
        questionText.textContent = question.pergunta; // Mostra apenas a pergunta

        // Adiciona um botão para mostrar/ocultar detalhes
        const toggleDetailsButton = document.createElement("button");
        toggleDetailsButton.textContent = "Mostrar Detalhes";
        toggleDetailsButton.className = "btn btn-info btn-sm";

        let detailsVisible = false; // Controle do estado de visibilidade

        toggleDetailsButton.onclick = () => {
            detailsVisible = !detailsVisible; // Alterna o estado
            if (detailsVisible) {
                // Se estiver visível, mostra os detalhes
                const detailsText = document.createElement("span");
                detailsText.className = "details-text"; // Classe para estilo
                detailsText.textContent = ` - Respostas: ${question.respostas.join(", ")} - Categoria: ${question.categoria} - Descrições: ${question.descricaoRespostas.join(", ")}`;
                li.appendChild(detailsText); // Adiciona detalhes à lista
                toggleDetailsButton.textContent = "Ocultar Detalhes"; // Muda o texto do botão
            } else {
                // Se estiver oculto, remove os detalhes
                const detailsText = li.querySelector(".details-text");
                if (detailsText) {
                    li.removeChild(detailsText); // Remove os detalhes
                }
                toggleDetailsButton.textContent = "Mostrar Detalhes"; // Restaura o texto do botão
            }
        };

        // Adiciona o botão de mostrar/ocultar ao contêiner
        buttonContainer.appendChild(toggleDetailsButton);
        li.appendChild(questionText);
        li.appendChild(buttonContainer);

        lista.appendChild(li);
    });
}

function updateDatalist() {
    const datalist = document.getElementById("categorias-list");
    datalist.innerHTML = ''; // Limpa o datalist existente

    categorias.forEach(categoria => {
        const option = document.createElement("option");
        option.value = categoria;
        datalist.appendChild(option);
    });
}

function loadScore() {
    const transaction = db.transaction(["score"], "readonly");
    const store = transaction.objectStore("score");
    const request = store.get(1);

    request.onsuccess = function (event) {
        if (event.target.result) {
            score = event.target.result.score;
            document.getElementById("score").textContent = score;
        }
    };
}

function saveScore() {
    const transaction = db.transaction(["score"], "readwrite");
    const store = transaction.objectStore("score");
    store.put({ id: 1, score: score });
}

function startQuiz() {
    currentCategory = document.getElementById("categoria-quiz").value;
    if (!currentCategory) {
        alertaTempo();
        showModalMessage("Selecione uma categoria para começar.",'alert');
        return;
    }

    // Obtenha o modo de jogo selecionado
    const modoJogo = document.getElementById("modo-jogo").value;

    // Define o tempo baseado no modo de jogo
    switch (modoJogo) {
        case "casual":
            tempo = null; // Sem limite de tempo
            break;
        case "hard":
            tempo = 10; // 10 segundos
            break;
        case "impossivel":
            tempo = 5; // 5 segundos
            break;
    }

    usedQuestions = [];
    document.getElementById("quiz").style.display = 'block';
    loadNextQuestion(questions.filter(q => q.categoria === currentCategory));
}

// Função para carregar a próxima pergunta
async function loadNextQuestion(perguntasFiltradas) {
    if (usedQuestions.length === perguntasFiltradas.length) {
        alertaConclusao();
        await showModalMessage("Você concluiu esta categoria! Para jogar novamente, inicie o quiz.",'alert');
        usedQuestions = []; // Reinicia as perguntas usadas
        document.getElementById("quiz").style.display = 'none'; // Esconde o quiz
        return; // Finaliza a função
    }

    let availableQuestions = perguntasFiltradas.filter((_, index) => !usedQuestions.includes(index));

    if (availableQuestions.length === 0) {
        await showModalMessage("Você concluiu esta categoria! Para jogar novamente, inicie o quiz.");
        document.getElementById("quiz").style.display = 'none'; // Esconde o quiz
        return; // Finaliza a função
    }

    const randomIndex = Math.floor(Math.random() * availableQuestions.length);
    currentQuestion = availableQuestions[randomIndex];
    usedQuestions.push(perguntasFiltradas.indexOf(currentQuestion));

    document.getElementById("pergunta-quiz").textContent = currentQuestion.pergunta;
    const opcoesDiv = document.getElementById("opcoes");
    opcoesDiv.innerHTML = '';

    // Embaralha as respostas
    const respostasComIndices = currentQuestion.respostas.map((resposta, index) => ({ resposta, index }));
    shuffleArray(respostasComIndices);

    // Adiciona as respostas embaralhadas aos botões
    respostasComIndices.forEach(({ resposta, index }) => {
        const button = document.createElement("button");
        button.textContent = resposta;
        button.classList.add("option");
        button.style.backgroundColor = getRandomColor(); // Define uma cor aleatória para o botão

        // Aqui, usamos o índice original da resposta (index do array embaralhado)
        const originalIndex = currentQuestion.respostas.indexOf(resposta);
        button.onclick = () => checkAnswer(originalIndex); // Corrige para usar o índice original

        opcoesDiv.appendChild(button);
    });

    // Se houver limite de tempo, inicia o temporizador
    if (tempo) {
        startTimer(tempo);
    } else {
        document.getElementById("next-question-button").disabled = false;
    }
}

function startTimer(tempoLimite) {
    document.getElementById("timer").textContent = `Tempo restante: ${tempoLimite} segundos`; // Exibe o tempo restante
    clearInterval(timer); // Limpa qualquer temporizador anterior

    timer = setInterval(async () => {
        if (tempoLimite > 0) {
            tempoLimite--;
            document.getElementById("timer").textContent = `Tempo restante: ${tempoLimite} segundos`;
        } else {
            clearInterval(timer);
            document.getElementById("timer").textContent = "Tempo esgotado!";
            alertaTempo();
            await showModalMessage("Tempo esgotado!",'error','error'); // Aguarda o fechamento do modal
            handleTimeOut(); // Chama a função após o modal ser fechado
        }
    }, 1000);
}

function handleTimeOut() {
    // Penalidades por tempo esgotado
    const modoJogo = document.getElementById("modo-jogo").value;
    switch (modoJogo) {
        case "hard":
            score--; // Perde 1 ponto
            break;
        case "impossivel":
            score -= 2; // Perde 2 pontos
            break;
    }
    document.getElementById("score").textContent = score;
    saveScore(); // Salva o score
    loadNextQuestion(questions.filter(q => q.categoria === currentCategory)); // Carrega a próxima pergunta
}

async function checkAnswer(selectedIndex) {
    const options = ["A", "B", "C", "D"];
    const selectedAnswer = options[selectedIndex];
    const respostaCorreta = currentQuestion.respostaCorreta;
    const descricao = currentQuestion.descricaoRespostas[selectedIndex];

    clearInterval(timer);
    document.getElementById("timer").textContent = "";

    if (selectedAnswer === respostaCorreta) {
        score++;
        alertaSucesso();
        await showModalMessage(`Correto! A resposta é: ${currentQuestion.respostas[selectedIndex]}\nDescrição: ${descricao}`, 'success');
    } else {
        alertaErro();
        await showModalMessage(`Errado! A resposta correta é: ${currentQuestion.respostas[["A", "B", "C", "D"].indexOf(respostaCorreta)]}\nDescrição: ${currentQuestion.descricaoRespostas[["A", "B", "C", "D"].indexOf(respostaCorreta)]}`, 'error');
        
        const modoJogo = document.getElementById("modo-jogo").value;
        switch (modoJogo) {
            case "hard":
                score--;
                break;
            case "impossivel":
                score -= 2;
                break;
        }
    }

    document.getElementById("score").textContent = score;
    saveScore();
    loadNextQuestion(questions.filter(q => q.categoria === currentCategory));
}


function nextQuestion() {
    // Diminui o score
    score--;
    document.getElementById("score").textContent = score;
    saveScore(); // Salva o score em indexedDB

    // Carrega a próxima pergunta
    loadNextQuestion(questions.filter(q => q.categoria === currentCategory)); // Mantém na categoria atual
}

function resetScore() {
    if (confirm("Você tem certeza que deseja resetar o score?")) {
        score = 0;
        document.getElementById("score").textContent = score;
        saveScore(); // Salva o score resetado em indexedDB
    }
}

function exportDatabase() {
    const transaction = db.transaction(["questions"], "readonly");
    const store = transaction.objectStore("questions");
    const request = store.getAll();

    request.onsuccess = function (event) {
        const data = event.target.result;
        const json = JSON.stringify(data);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = "quiz.json";
        a.click();

        URL.revokeObjectURL(url);
    };
}

function toggleDescricao(descricaoId) {
    const descricaoInput = document.getElementById(descricaoId);
    const mostrarButton = document.querySelector(`.toggle-descricao[onclick*="${descricaoId}"]`);
    const ocultarButton = document.querySelector(`.hide-descricao[onclick*="${descricaoId}"]`);

    if (descricaoInput.style.display === 'none') {
        descricaoInput.style.display = 'block'; // Mostra a descrição
        mostrarButton.style.display = 'none'; // Esconde o botão de mostrar
        ocultarButton.style.display = 'inline'; // Mostra o botão de ocultar
    } else {
        descricaoInput.style.display = 'none'; // Esconde a descrição
        mostrarButton.style.display = 'inline'; // Mostra o botão de mostrar
        ocultarButton.style.display = 'none'; // Esconde o botão de ocultar
    }
}

function importDatabase(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const json = e.target.result;
            const data = JSON.parse(json);

            const transaction = db.transaction(["questions"], "readwrite");
            const store = transaction.objectStore("questions");

            // Limpa o banco antes de importar novas perguntas
            const clearRequest = store.clear();
            clearRequest.onsuccess = function () {
                // Adiciona cada item do JSON ao banco
                data.forEach(item => {
                    store.put(item);
                });

                // Atualiza a lista de perguntas e categorias após a importação
                loadQuestions(); // Carrega as perguntas
                loadCategorias(); // Atualiza as categorias
                alertaConclusao();
                showModalMessage("Banco de dados importado com sucesso!",'success');

            };
        } catch (error) {
            alertaTempo();
            showModalMessage("Erro ao importar o banco de dados: " + error.message);
        }
    };

    reader.readAsText(file);
}

// Função para tocar o som de sucesso
function alertaSucesso() {
    const successSound = document.getElementById("sucesso-sound");
    successSound.play(); // Toca o som de sucesso
}
function alertaErro() {
    const erroSound = document.getElementById("erro-sound");
    erroSound.play(); // Toca o som de erro
}
function alertaConclusao() {
    const erroSound = document.getElementById("conclusao-sound");
    erroSound.play(); // Toca o som de conclusão
}
function alertaTempo() {
    const erroSound = document.getElementById("tempo-sound");
    erroSound.play(); // Toca o som de tempo esgotado
}
//modal para controlar as respostas
let resolveModalPromise;

function openModal() {
    document.getElementById("modal").style.display = "block";
}

function closeModal() {
    const modal = document.getElementById("modal");
    modal.style.display = "none";
    
    // Limpa a classe para não afetar o próximo uso
    const modalContent = document.getElementById("modal-content");
    modalContent.className = "modal-content"; // Reseta as classes

    if (resolveModalPromise) {
        resolveModalPromise(); // Resolve a promessa quando o modal é fechado
        resolveModalPromise = null; // Limpa a referência
    }
}

/*cores para o modal padrão neutro
lembre-se sempre que for usar showModalMessage tem que por qual type de modal vai querer usar 
se nao especificar o padrão neutral será usado*/
function showModalMessage(message, type) {
    const modalContent = document.getElementById("modal-content");
    modalContent.className = "modal-content"; // Limpa classes anteriores

    if (type === 'success') {
        modalContent.classList.add('success');
    } else if (type === 'error') {
        modalContent.classList.add('error');
    } else if (type === 'alert') {
        modalContent.classList.add('alert');
    } else {
        modalContent.classList.add('neutral'); // Classe padrão para mensagens neutras
    }

    document.getElementById("modal-message").textContent = message;
    document.getElementById("modal").style.display = "block"; // Mostra o modal
    return new Promise((resolve) => {
        resolveModalPromise = resolve; // Armazena a função de resolução da promessa
    });
}



// Fechar o modal ao clicar fora dele
window.onclick = function (event) {
    const modal = document.getElementById("modal");
    if (event.target === modal) {
        closeModal();
    }
};

//service worker para funcionar offline
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js')
        .then(function (registration) {
            console.log('Service Worker registrado com sucesso:', registration.scope);
        }).catch(function (error) {
            console.log('Falha ao registrar o Service Worker:', error);
        });
}
//fim service worker para funcionar offline