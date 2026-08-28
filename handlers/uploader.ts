import * as http from "http";
import * as fs from "fs";
import * as path from "path";

const UPLOAD_PORT = 8084;
const UPLOAD_HOST = "127.0.0.1";
const PHOTOS_DIR = path.resolve(process.cwd(), "savedata/photos");

const ensureDirectoryExists = (dirPath: string) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

/**
 * Basic POSIX tar archive extractor to unpack files without third-party dependencies.
 */
function extractTar(tarBuffer: Buffer): { name: string; data: Buffer }[] {
  const files: { name: string; data: Buffer }[] = [];
  let offset = 0;

  while (offset + 512 <= tarBuffer.length) {
    const header = tarBuffer.subarray(offset, offset + 512);
    // Check for empty block (end of tar)
    if (header.every((b) => b === 0)) break;

    // File name: 0..100
    let nameEnd = header.indexOf(0, 0);
    if (nameEnd < 0 || nameEnd > 100) nameEnd = 100;
    const rawName = header.subarray(0, nameEnd).toString("ascii").trim();
    if (!rawName) break;

    // File size: 124..136 in octal ASCII
    const sizeStr = header.subarray(124, 136).toString("ascii").trim().replace(/\0/g, "");
    const size = parseInt(sizeStr, 8);

    offset += 512;
    if (isNaN(size) || size < 0 || offset + size > tarBuffer.length) break;

    const fileData = tarBuffer.subarray(offset, offset + size);
    files.push({ name: path.basename(rawName), data: fileData });

    // Tar blocks are padded to 512 bytes
    offset += Math.ceil(size / 512) * 512;
  }

  return files;
}

let serverStarted = false;

export const startUploadServer = () => {
  if (serverStarted) return;
  ensureDirectoryExists(PHOTOS_DIR);

  const server = http.createServer((req, res) => {
    if (req.method === "POST") {
      const chunks: Buffer[] = [];

      req.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
      });

      req.on("end", () => {
        const body = Buffer.concat(chunks);
        console.log(`[Uploader] Received HTTP POST payload: ${body.length} bytes at ${req.url}`);

        let payloadBuffer = body;
        let originalFileName = `upload_${Date.now()}.tar`;

        // Check if payload is multipart/form-data
        const contentType = req.headers["content-type"] || "";
        if (contentType.includes("multipart/form-data")) {
          // Look for boundary and extract raw payload
          const bodyHeaderStr = body.subarray(0, Math.min(body.length, 2048)).toString("ascii");
          const filenameMatch = bodyHeaderStr.match(/filename="([^"]+)"/i) || bodyHeaderStr.match(/name="([^"]+)"/i);
          if (filenameMatch && filenameMatch[1]) {
            originalFileName = path.basename(filenameMatch[1]);
          }

          // Search for start of binary content after headers (\r\n\r\n)
          const headerEnd = body.indexOf(Buffer.from("\r\n\r\n"));
          if (headerEnd !== -1) {
            // Find last boundary delimiter
            const boundaryEnd = body.lastIndexOf(Buffer.from("\r\n--"));
            if (boundaryEnd > headerEnd) {
              payloadBuffer = body.subarray(headerEnd + 4, boundaryEnd);
            } else {
              payloadBuffer = body.subarray(headerEnd + 4);
            }
          }
        }

        // Determine user/refid from filename (e.g. AB86DA242B34739E_20260828181115_00.tar)
        const parts = originalFileName.split("_");
        const refId = parts[0] || "unknown";

        const refDir = path.join(PHOTOS_DIR, refId);
        ensureDirectoryExists(refDir);

        // Check if the payload is a tar archive or directly contains JPEG images
        const extractedFiles = extractTar(payloadBuffer);
        if (extractedFiles.length > 0) {
          console.log(`[Uploader] Extracted ${extractedFiles.length} file(s) from TAR archive:`);
          for (const f of extractedFiles) {
            const outPath = path.join(refDir, f.name);
            fs.writeFileSync(outPath, f.data);
            console.log(`[Uploader] -> Saved: ${outPath} (${f.data.length} bytes)`);
          }
        } else {
          // Fallback: search for JPEG magic bytes directly
          const jpegStart = payloadBuffer.indexOf(Buffer.from([0xff, 0xd8, 0xff]));
          const jpegEnd = payloadBuffer.lastIndexOf(Buffer.from([0xff, 0xd9]));
          if (jpegStart !== -1 && jpegEnd !== -1 && jpegEnd > jpegStart) {
            const jpegData = payloadBuffer.subarray(jpegStart, jpegEnd + 2);
            const jpegName = originalFileName.replace(/\.tar$/i, ".jpg");
            const outPath = path.join(refDir, jpegName);
            fs.writeFileSync(outPath, jpegData);
            console.log(`[Uploader] -> Saved fallback JPEG: ${outPath} (${jpegData.length} bytes)`);
          } else {
            // Save raw binary
            const rawPath = path.join(refDir, originalFileName);
            fs.writeFileSync(rawPath, payloadBuffer);
            console.log(`[Uploader] -> Saved raw file: ${rawPath} (${payloadBuffer.length} bytes)`);
          }
        }

        res.writeHead(200, {
          "Content-Type": "text/plain",
          "Content-Length": "2",
        });
        res.end("OK");
      });

      req.on("error", (err) => {
        console.error("[Uploader] Error processing upload request:", err);
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("Error");
      });
    } else {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not Found");
    }
  });

  server.listen(UPLOAD_PORT, "0.0.0.0", () => {
    console.log(`[Uploader] Photo Upload Server listening on http://0.0.0.0:${UPLOAD_PORT}/upload`);
  });

  server.on("error", (err) => {
    console.error("[Uploader] Failed to start Upload Server:", err);
  });

  serverStarted = true;
};

/**
 * Handles `uploader.declareUpload` RPC call from the game.
 *
 * Game PSMAP requires the following fields directly under <uploader>:
 * - arrangeNum
 * - uploadUrl
 * - urlValidSec
 * - accessKey
 * - bandWidth
 * - expireDate
 */
export const declareUpload: EPR = async (info, data, send) => {
  console.log("[Uploader] uploader.declareUpload received");

  const arrangeNum = `${Math.floor(1000000000 + Math.random() * 9000000000)}`;

  return send.object({
    arrangeNum: K.ITEM("str", arrangeNum),
    uploadUrl: K.ITEM("str", `http://${UPLOAD_HOST}:${UPLOAD_PORT}/upload`),
    urlValidSec: K.ITEM("s32", 86400),
    accessKey: K.ITEM("str", "MZ4Eof5qdyLLN1IX3BkD7sWyQ374yPm1"),
    bandWidth: K.ITEM("s32", 104857600),
    expireDate: K.ITEM("str", "2030-12-31"),
  });
};

/**
 * Handles `uploader.commitUpload` RPC call from the game.
 */
export const commitUpload: EPR = async (info, data, send) => {
  console.log("[Uploader] uploader.commitUpload received");
  return send.success();
};
