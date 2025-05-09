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