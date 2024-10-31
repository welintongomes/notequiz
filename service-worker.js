// // Cria um nome dinâmico para o cache, incluindo um identificador de versão
// const CACHE_VERSION = 'v2'; // Mude o valor para forçar uma nova versão
// const CACHE_NAME = `meu-site-cache-${CACHE_VERSION}`;
// const urlsToCache = [
//     './',
//     './index.html',
//     './notas/icon-192x192.png',
//     './notas/icon-512x512.png',
//     './notas/style.css',
//     './notas/script.js',

//     './outros/bootstrap.bundle.min.js',
//     './outros/bootstrap.min.css',
//     './outros/manifest.json',
//     './outros/crypto-js.min.js',

//     // Arquivos na subpasta formatar
//     './formatar/formatar.html',
//     './formatar/formatar.css',
//     './formatar/formatar.js',
//     './formatar/f-192x192.png',

//     // Arquivos na subpasta quiz
//     './quiz/quiz.html',
//     './quiz/quiz.css',
//     './quiz/quiz.js',
//     './quiz/acertou.mp3',
//     './quiz/conclusao.mp3',
//     './quiz/errou.mp3',
//     './quiz/fracasso.mp3',
//     './quiz/timeout.mp3',
//     './quiz/q-192x192.png',
// ];

// // Instala e faz o cache dos arquivos da nova versão
// self.addEventListener('install', function(event) {
//     event.waitUntil(
//         caches.open(CACHE_NAME)
//             .then(function(cache) {
//                 console.log('Cache atualizado com sucesso!');
//                 return cache.addAll(urlsToCache);
//             })
//             .then(() => self.skipWaiting()) // Força a ativação do novo Service Worker
//             .catch(function(error) {
//                 console.error('Falha ao adicionar arquivos ao cache:', error);
//             })
//     );
// });

// // Ativa o novo Service Worker e limpa caches antigos
// self.addEventListener('activate', function(event) {
//     event.waitUntil(
//         caches.keys().then(function(cacheNames) {
//             return Promise.all(
//                 cacheNames.map(function(cacheName) {
//                     if (cacheName !== CACHE_NAME) {
//                         return caches.delete(cacheName);
//                     }
//                 })
//             );
//         })
//     );
//     return self.clients.claim(); // Assume o controle da página imediatamente
// });

// // Intercepta as requisições e responde com o cache atualizado
// self.addEventListener('fetch', function(event) {
//     if (!event.request.url.startsWith('http')) return; // Ignora requisições não-HTTP

//     event.respondWith(
//         caches.match(event.request).then(function(cachedResponse) {
//             // Se há resposta em cache, retorna imediatamente
//             if (cachedResponse) {
//                 // Clona a request para atualizar o cache em segundo plano
//                 const fetchRequest = event.request.clone();
//                 fetch(fetchRequest).then(function(networkResponse) {
//                     if (networkResponse.ok) {
//                         caches.open(CACHE_NAME).then(function(cache) {
//                             cache.put(event.request, networkResponse.clone());
//                         });
//                     }
//                 }).catch(function(error) {
//                     console.error('Erro ao atualizar o cache em segundo plano:', error);
//                 });
//                 return cachedResponse;
//             }

//             // Caso não exista no cache, faz o fetch da rede
//             return fetch(event.request).then(function(networkResponse) {
//                 if (networkResponse.ok) {
//                     // Clona e coloca no cache apenas se a resposta foi bem-sucedida
//                     const responseClone = networkResponse.clone();
//                     caches.open(CACHE_NAME).then(function(cache) {
//                         cache.put(event.request, responseClone);
//                     });
//                 }
//                 return networkResponse;
//             }).catch(function(error) {
//                 console.error('Erro na requisição de rede:', error);
//             });
//         })
//     );
// });

const CACHE_NAME = `meu-site-cache-${new Date().getTime()}`;
const urlsToCache = [
    './',
    './index.html',
    './notas/icon-192x192.png',
    './notas/icon-512x512.png',
    './notas/style.css',
    './notas/script.js',

    './outros/bootstrap.bundle.min.js',
    './outros/bootstrap.min.css',
    './outros/manifest.json',
    './outros/crypto-js.min.js',

    // Arquivos na subpasta formatar
    './formatar/formatar.html',
    './formatar/formatar.css',
    './formatar/formatar.js',
    './formatar/f-192x192.png',

    // Arquivos na subpasta quiz
    './quiz/quiz.html',
    './quiz/quiz.css',
    './quiz/quiz.js',
    './quiz/acertou.mp3',
    './quiz/conclusao.mp3',
    './quiz/errou.mp3',
    './quiz/fracasso.mp3',
    './quiz/timeout.mp3',
    './quiz/q-192x192.png',
];

// Instala e faz o cache dos arquivos da nova versão
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Cache atualizado com sucesso!');
                return cache.addAll(urlsToCache);
            })
            .then(() => self.skipWaiting())
            .catch((error) => console.error('Falha ao adicionar arquivos ao cache:', error))
    );
});

// Ativa o novo Service Worker e limpa caches antigos
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) =>
            Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            )
        )
    );
    return self.clients.claim(); // Assume controle da página imediatamente
});

// Verifica e atualiza automaticamente os usuários com versões desatualizadas
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // Retorna a resposta do cache, se houver
            if (cachedResponse) {
                return cachedResponse;
            }

            // Se não estiver no cache, faz a requisição de rede
            return fetch(event.request).then((networkResponse) => {
                // Verifica se a resposta pode ser clonada e tem status 200
                if (networkResponse && networkResponse.status === 200) {
                    // Tenta clonar a resposta apenas se possível
                    const responseClone = networkResponse.clone();

                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone).catch((error) => {
                            console.warn('Falha ao salvar no cache:', error);
                        });
                    });
                }
                return networkResponse;
            }).catch((error) => {
                console.error('Erro ao buscar recurso:', error);
                throw error;
            });
        })
    );
});



