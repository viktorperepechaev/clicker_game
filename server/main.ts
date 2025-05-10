// // import { serve } from "https://deno.land/std@0.208.0/http/server.ts"; // Using Deno.serve directly
// import { contentType } from "jsr:@std/media-types@^0.224.0/content-type"; // Corrected import path

// // Открываем KV базу данных
// const kv = await Deno.openKv();

// // Тип для записей рекордов
// interface ScoreRecord {
//     id: string; // Будем использовать timestamp как часть ID
//     name: string;
//     score: number;
//     timestamp: string; // ISO string
// }

// async function handler(req: Request): Promise<Response> {
//     const url = new URL(req.url);
//     const pathname = url.pathname;

//     // ---- API эндпоинты ----
//     if (pathname === "/api/scores" && req.method === "GET") {
//         try {
//             const recordsIter = kv.list<ScoreRecord>({ prefix: ["scores"] });
//             const scores: ScoreRecord[] = [];
//             for await (const entry of recordsIter) {
//                 scores.push(entry.value);
//             }

//             // Сортировка: сначала по очкам (убывание), затем по дате (возрастание)
//             // This initial server-side sort is a good default. Client-side can override.
//             scores.sort((a, b) => {
//                 if (b.score !== a.score) {
//                     return b.score - a.score;
//                 }
//                 return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
//             });

//             return new Response(JSON.stringify(scores.slice(0, 100)), { // Отдаем топ 100
//                 headers: { "Content-Type": "application/json" },
//             });
//         } catch (error) {
//             console.error("Error fetching scores:", error);
//             return new Response(JSON.stringify({ message: "Internal server error while fetching scores" }), { 
//                 status: 500,
//                 headers: { "Content-Type": "application/json" }
//             });
//         }
//     }

//     if (pathname === "/api/scores" && req.method === "POST") {
//         try {
//             const body = await req.json();
//             const { name, score } = body;

//             if (typeof name !== 'string' || name.trim() === '' || typeof score !== 'number' || score < 0) {
//                 return new Response(JSON.stringify({ message: "Invalid data: name must be a non-empty string and score a non-negative number." }), { 
//                     status: 400,
//                     headers: { "Content-Type": "application/json" }
//                 });
//             }

//             const timestamp = new Date().toISOString();
//             const recordId = `${timestamp}_${Math.random().toString(36).substring(2,9)}`; 

//             const record: ScoreRecord = {
//                 id: recordId,
//                 name: name.trim().slice(0, 20), 
//                 score: Math.floor(score),       
//                 timestamp,
//             };

//             const result = await kv.set(["scores", recordId], record);
//             if (!result.ok) {
//                  throw new Error("Failed to save record to KV store.");
//             }


//             return new Response(JSON.stringify({ message: "Score saved", record }), {
//                 status: 201,
//                 headers: { "Content-Type": "application/json" },
//             });
//         } catch (error) {
//             console.error("Error saving score:", error);
//             if (error instanceof SyntaxError) { 
//                  return new Response(JSON.stringify({ message: "Invalid JSON payload" }), { 
//                     status: 400,
//                     headers: { "Content-Type": "application/json" } 
//                 });
//             }
//             return new Response(JSON.stringify({ message: "Internal server error while saving score" }), { 
//                 status: 500,
//                 headers: { "Content-Type": "application/json" }
//             });
//         }
//     }

//     // ---- Сервинг статических файлов ----
//     // Adjusted to serve from the root directory where index.html, style.css, script.js are expected
//     let filePath = "./public" + pathname; // Prepend "public/" to access files in that directory
//     if (pathname === "/") {
//         filePath = "./public/index.html";
//     }

//     try {
//         const fileStat = await Deno.stat(filePath);
//         if (fileStat.isDirectory) { // Prevent serving directories
//             // If you want to serve index.html from directories, handle that here
//             // For now, treat as not found if it's a directory and not root path
//             if (pathname.endsWith('/')) {
//                  filePath = filePath + "index.html"; // Try to serve index.html in directory
//             } else {
//                  // If not root and is a directory without trailing slash, redirect or 404
//                  // For simplicity, let it fall to Deno.readFile error / 404
//             }
//         }
        
//         const file = await Deno.readFile(filePath);
//         const resolvedContentType = contentType(filePath.split('.').pop() || "") || "application/octet-stream";
//         return new Response(file, {
//             headers: { "Content-Type": resolvedContentType },
//         });
//     } catch (e) {
//         if (e instanceof Deno.errors.NotFound) {
//             // Log only if it's not an API path that wasn't found
//             if (!pathname.startsWith("/api/")) {
//                  console.log(`Static file not found: ${filePath}`);
//             }
//             return new Response("Resource Not Found", { 
//                 status: 404,
//                 headers: { "Content-Type": "text/plain" }
//             });
//         } else {
//             console.error(`File serving error for ${filePath}:`, e);
//             return new Response("Internal Server Error while serving file", { 
//                 status: 500,
//                 headers: { "Content-Type": "text/plain" }
//             });
//         }
//     }
// }

// console.log("HTTP server running. Access it at: http://localhost:8000/");
// Deno.serve({ port: 8000, handler });
// import { serve } from "https://deno.land/std@0.208.0/http/server.ts"; // Используйте актуальную версию
// import { contentType } from "https://deno.land/std@0.208.0/media_types/mod.ts";

import { contentType } from "jsr:@std/media-types@^0.224.0";
// import { contentType } from "jsr:@std/media-types@^0.1.0"; // This was the previous attempt

// Открываем KV базу данных
const kv = await Deno.openKv();

// Тип для записей рекордов
interface ScoreRecord {
    id: string; // Будем использовать timestamp как часть ID
    name: string;
    score: number;
    timestamp: string; // ISO string
}

async function handler(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const pathname = url.pathname;

    // ---- API эндпоинты ----
    if (pathname === "/api/scores" && req.method === "GET") {
        try {
            const recordsIter = kv.list<ScoreRecord>({ prefix: ["scores"] });
            const scores: ScoreRecord[] = [];
            for await (const entry of recordsIter) {
                scores.push(entry.value);
            }

            // Сортировка: сначала по очкам (убывание), затем по дате (возрастание)
            scores.sort((a, b) => {
                if (b.score !== a.score) {
                    return b.score - a.score;
                }
                return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
            });

            return new Response(JSON.stringify(scores.slice(0, 100)), { // Отдаем топ 100
                headers: { "Content-Type": "application/json" },
            });
        } catch (error) {
            console.error("Error fetching scores:", error);
            return new Response(JSON.stringify({ message: "Internal server error" }), { status: 500 });
        }
    }

    if (pathname === "/api/scores" && req.method === "POST") {
        try {
            const body = await req.json();
            const { name, score } = body;

            if (typeof name !== 'string' || name.trim() === '' || typeof score !== 'number' || score < 0) {
                return new Response(JSON.stringify({ message: "Invalid data" }), { status: 400 });
            }

            const timestamp = new Date().toISOString();
            const recordId = `${timestamp}_${Math.random().toString(36).substring(2,9)}`; // Уникальный ID

            const record: ScoreRecord = {
                id: recordId,
                name: name.trim().slice(0, 20), // Ограничение длины имени
                score: Math.floor(score),       // Убедимся, что score - целое
                timestamp,
            };

            await kv.set(["scores", recordId], record);

            return new Response(JSON.stringify({ message: "Score saved", record }), {
                status: 201,
                headers: { "Content-Type": "application/json" },
            });
        } catch (error) {
            console.error("Error saving score:", error);
            if (error instanceof SyntaxError) { // Ошибка парсинга JSON
                 return new Response(JSON.stringify({ message: "Invalid JSON payload" }), { status: 400 });
            }
            return new Response(JSON.stringify({ message: "Internal server error" }), { status: 500 });
        }
    }

    // ---- Сервинг статических файлов ----
    let filePath = "./public" + pathname;
    if (pathname === "/") {
        filePath = "./public/index.html";
    }

    try {
        const file = await Deno.readFile(filePath);
        const type = contentType(filePath.split('.').pop() || "") || "application/octet-stream";
        return new Response(file, {
            headers: { "Content-Type": type },
        });
    } catch (e) {
        if (e instanceof Deno.errors.NotFound) {
            // Если файл не найден, и это не API-запрос, отдаем 404
            if (!pathname.startsWith("/api/")) {
                 return new Response("Not Found", { status: 404 });
            }
        } else {
            console.error("File serving error:", e);
            return new Response("Internal Server Error", { status: 500 });
        }
    }
    
    // Если ни один роут не сработал (например, API-запрос на несуществующий эндпоинт)
    return new Response("Not Found (No matching route)", { status: 404 });
}

console.log("HTTP server running. Access it at: http://localhost:8000/");
Deno.serve({ handler: handler, port: 8000 });