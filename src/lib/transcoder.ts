import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

export async function convertToWhatsAppVoiceNote(inputBuffer: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const tempId = uuidv4();
    const inputPath = path.join(os.tmpdir(), `input-${tempId}.mp4`);
    const outputPath = path.join(os.tmpdir(), `output-${tempId}.ogg`);

    fs.writeFileSync(inputPath, inputBuffer);

    ffmpeg(inputPath)
      .toFormat('ogg')
      .audioCodec('libopus')
      .audioChannels(1) // WhatsApp exige Mono para renderizar como Voice Note
      .audioBitrate('32k') // Bitrate estándar de notas de voz
      .outputOptions('-application', 'voip') // Optimización para voz
      .on('end', () => {
        try {
          const outputBuffer = fs.readFileSync(outputPath);
          // Cleanup
          fs.unlinkSync(inputPath);
          fs.unlinkSync(outputPath);
          resolve(outputBuffer);
        } catch (err) {
          reject(err);
        }
      })
      .on('error', (err) => {
        // Cleanup on error
        try { if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath); } catch (e) {}
        try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch (e) {}
        console.error('[Transcoder Error]', err);
        reject(err);
      })
      .save(outputPath);
  });
}
