/**
 * Client-Side Image Compression Service
 * Resizes, optimizes, and converts uploaded images to WebP/JPEG format
 * before uploading to server, saving up to 80% bandwidth.
 * 
 * @version 3.0.0
 * @author Bavel Team
 */

// ============================================
// 1. TYPES
// ============================================

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0
  format?: 'image/webp' | 'image/jpeg' | 'image/png';
  preserveOrientation?: boolean;
  maintainAspectRatio?: boolean;
  convertToGrayscale?: boolean;
  blur?: number;
  sharpen?: number;
  metadata?: boolean;
  maxFileSize?: number; // En bytes
}

export interface CompressionResult {
  file: File;
  dataUrl: string;
  originalSize: number;
  compressedSize: number;
  savedPercent: number;
  width: number;
  height: number;
  format: string;
  quality: number;
  duration: number;
  dimensions: {
    originalWidth: number;
    originalHeight: number;
    compressedWidth: number;
    compressedHeight: number;
  };
}

export interface ImageInfo {
  width: number;
  height: number;
  fileSize: number;
  format: string;
  orientation?: number;
  colorSpace?: string;
}

export const DEFAULT_COMPRESSION_OPTIONS: Required<CompressionOptions> = {
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 0.82,
  format: 'image/webp',
  preserveOrientation: true,
  maintainAspectRatio: true,
  convertToGrayscale: false,
  blur: 0,
  sharpen: 0,
  metadata: false,
  maxFileSize: 10 * 1024 * 1024, // 10MB
};

// ============================================
// 2. CLASS PRINCIPALE
// ============================================

export class ImageCompressionService {
  private static readonly SUPPORTED_FORMATS = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/bmp',
    'image/tiff',
    'image/heic',
    'image/heif',
    'image/avif',
  ];

  private static readonly MAX_PIXELS = 50 * 1024 * 1024; // 50MP
  private static readonly MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

  // ============================================
  // 2.1 COMPRESSION PRINCIPALE
  // ============================================

  /**
   * Compresses a File object and returns optimized result
   */
  public static async compressImageFile(
    file: File,
    options: CompressionOptions = {}
  ): Promise<CompressionResult> {
    const opts = { ...DEFAULT_COMPRESSION_OPTIONS, ...options };
    const startTime = performance.now();

    // Validation
    this.validateFile(file);

    // Lire l'image
    const imageInfo = await this.loadImage(file);
    const { img, info } = imageInfo;

    // Calculer les dimensions
    const dimensions = this.calculateDimensions(
      info.width,
      info.height,
      opts
    );

    // Créer le canvas
    const canvas = this.createCanvas(dimensions.width, dimensions.height);
    const ctx = this.getContext(canvas);

    // Appliquer les transformations
    this.applyTransformations(ctx, img, dimensions, opts);

    // Exporter
    const result = await this.exportImage(canvas, file, opts);

    const duration = performance.now() - startTime;

    return {
      file: result.file,
      dataUrl: result.dataUrl,
      originalSize: file.size,
      compressedSize: result.file.size,
      savedPercent: Math.round(((file.size - result.file.size) / file.size) * 100),
      width: dimensions.width,
      height: dimensions.height,
      format: result.format,
      quality: opts.quality,
      duration,
      dimensions: {
        originalWidth: info.width,
        originalHeight: info.height,
        compressedWidth: dimensions.width,
        compressedHeight: dimensions.height,
      },
    };
  }

  // ============================================
  // 2.2 VALIDATION
  // ============================================

  private static validateFile(file: File): void {
    if (!file) {
      throw new Error('Aucun fichier fourni');
    }

    if (!this.SUPPORTED_FORMATS.includes(file.type)) {
      throw new Error(
        `Format non supporté: ${file.type}. Formats acceptés: ${this.SUPPORTED_FORMATS.join(', ')}`
      );
    }

    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error(
        `Fichier trop volumineux (${this.formatBytes(file.size)}). Maximum: ${this.formatBytes(this.MAX_FILE_SIZE)}`
      );
    }

    if (file.size === 0) {
      throw new Error('Le fichier est vide');
    }
  }

  // ============================================
  // 2.3 CHARGEMENT D'IMAGE
  // ============================================

  private static async loadImage(file: File): Promise<{
    img: HTMLImageElement;
    info: ImageInfo;
  }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onerror = () => {
        reject(new Error('Erreur de lecture du fichier'));
      };

      reader.onload = (e) => {
        const img = new Image();
        
        img.onerror = () => {
          reject(new Error('Format d\'image invalide ou corrompu'));
        };

        img.onload = () => {
          // Vérifier la taille maximale
          const pixelCount = img.width * img.height;
          if (pixelCount > this.MAX_PIXELS) {
            reject(
              new Error(
                `Image trop grande (${Math.round(pixelCount / 1024 / 1024)}MP). Maximum: ${Math.round(this.MAX_PIXELS / 1024 / 1024)}MP`
              )
            );
          }

          resolve({
            img,
            info: {
              width: img.width,
              height: img.height,
              fileSize: file.size,
              format: file.type || 'unknown',
            },
          });
        };

        img.src = e.target?.result as string;
      };

      reader.readAsDataURL(file);
    });
  }

  // ============================================
  // 2.4 CALCUL DES DIMENSIONS
  // ============================================

  private static calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    opts: Required<CompressionOptions>
  ): { width: number; height: number } {
    let width = originalWidth;
    let height = originalHeight;

    if (!opts.maintainAspectRatio) {
      // Sans conservation du ratio
      if (opts.maxWidth && width > opts.maxWidth) {
        width = opts.maxWidth;
      }
      if (opts.maxHeight && height > opts.maxHeight) {
        height = opts.maxHeight;
      }
      return { width, height };
    }

    // Avec conservation du ratio
    const maxWidth = opts.maxWidth || 99999;
    const maxHeight = opts.maxHeight || 99999;

    if (width > maxWidth || height > maxHeight) {
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    // S'assurer que les dimensions sont paires (performance)
    width = width % 2 === 0 ? width : width + 1;
    height = height % 2 === 0 ? height : height + 1;

    return { width, height };
  }

  // ============================================
  // 2.5 CANVAS
  // ============================================

  private static createCanvas(width: number, height: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  private static getContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
    const ctx = canvas.getContext('2d', {
      alpha: true,
      willReadFrequently: false,
    });

    if (!ctx) {
      throw new Error('Contexte Canvas indisponible');
    }

    // Qualité d'image optimale
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    return ctx;
  }

  // ============================================
  // 2.6 TRANSFORMATIONS
  // ============================================

  private static applyTransformations(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    dimensions: { width: number; height: number },
    opts: Required<CompressionOptions>
  ): void {
    const { width, height } = dimensions;

    // Niveau de gris
    if (opts.convertToGrayscale) {
      ctx.filter = 'grayscale(100%)';
    }

    // Flou
    if (opts.blur > 0) {
      ctx.filter += ` blur(${opts.blur}px)`;
    }

    // Dessiner l'image
    ctx.drawImage(img, 0, 0, width, height);

    // Réinitialiser le filtre pour les opérations suivantes
    ctx.filter = 'none';

    // Netteté (sharpen)
    if (opts.sharpen > 0) {
      this.applySharpen(ctx, width, height, opts.sharpen);
    }
  }

  private static applySharpen(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    intensity: number
  ): void {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const factor = Math.min(intensity / 100, 1);
    
    // Kernel de netteté simplifié
    const kernel = [
      0, -1 * factor, 0,
      -1 * factor, 1 + 4 * factor, -1 * factor,
      0, -1 * factor, 0
    ];

    const side = Math.round(Math.sqrt(kernel.length));
    const half = Math.floor(side / 2);
    const tempData = new Uint8ClampedArray(data);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0;
        
        for (let ky = 0; ky < side; ky++) {
          for (let kx = 0; kx < side; kx++) {
            const px = Math.min(width - 1, Math.max(0, x + kx - half));
            const py = Math.min(height - 1, Math.max(0, y + ky - half));
            const idx = (py * width + px) * 4;
            const weight = kernel[ky * side + kx];
            
            r += tempData[idx] * weight;
            g += tempData[idx + 1] * weight;
            b += tempData[idx + 2] * weight;
          }
        }

        const idx = (y * width + x) * 4;
        data[idx] = Math.max(0, Math.min(255, r));
        data[idx + 1] = Math.max(0, Math.min(255, g));
        data[idx + 2] = Math.max(0, Math.min(255, b));
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }

  // ============================================
  // 2.7 EXPORT
  // ============================================

  private static async exportImage(
    canvas: HTMLCanvasElement,
    originalFile: File,
    opts: Required<CompressionOptions>
  ): Promise<{ file: File; dataUrl: string; format: string }> {
    const targetFormat = opts.format;
    const quality = opts.quality;

    // Vérifier le support du format
    const isFormatSupported = this.isFormatSupported(targetFormat);
    const format = isFormatSupported ? targetFormat : 'image/jpeg';
    const extension = this.getExtension(format);

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Échec de la conversion de l\'image'));
            return;
          }

          // Vérifier la taille maximale
          if (opts.maxFileSize && blob.size > opts.maxFileSize) {
            // Réessayer avec une qualité inférieure
            const newQuality = Math.max(0.1, quality - 0.2);
            canvas.toBlob(
              (newBlob) => {
                if (!newBlob) {
                  reject(new Error('Impossible de réduire la taille de l\'image'));
                  return;
                }
                this.resolveExport(newBlob, originalFile, extension, format);
              },
              format,
              newQuality
            );
            return;
          }

          this.resolveExport(blob, originalFile, extension, format);
        },
        format,
        quality
      );
    });
  }

  private static resolveExport(
    blob: Blob,
    originalFile: File,
    extension: string,
    format: string
  ): { file: File; dataUrl: string; format: string } {
    const fileName = originalFile.name.replace(/\.[^/.]+$/, '') + extension;
    const file = new File([blob], fileName, {
      type: format,
      lastModified: Date.now(),
    });

    const reader = new FileReader();
    const dataUrl = reader.result as string;

    return { file, dataUrl, format };
  }

  // ============================================
  // 2.8 UTILITAIRES
  // ============================================

  private static isFormatSupported(format: string): boolean {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      return canvas.toDataURL(format).startsWith(`data:${format}`);
    } catch {
      return false;
    }
  }

  private static getExtension(format: string): string {
    const extensions: Record<string, string> = {
      'image/webp': '.webp',
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/bmp': '.bmp',
      'image/tiff': '.tiff',
      'image/avif': '.avif',
    };
    return extensions[format] || '.jpg';
  }

  public static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const size = parseFloat((bytes / Math.pow(k, i)).toFixed(1));
    return `${size} ${sizes[i]}`;
  }

  public static getImageInfo(file: File): Promise<ImageInfo> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          resolve({
            width: img.width,
            height: img.height,
            fileSize: file.size,
            format: file.type || 'unknown',
          });
        };
        img.onerror = () => reject(new Error('Impossible de charger l\'image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Erreur de lecture'));
      reader.readAsDataURL(file);
    });
  }

  // ============================================
  // 2.9 COMPRESSION BATCH
  // ============================================

  public static async compressMultipleFiles(
    files: File[],
    options: CompressionOptions = {},
    onProgress?: (progress: number, file: File, result?: CompressionResult) => void
  ): Promise<CompressionResult[]> {
    const results: CompressionResult[] = [];
    const total = files.length;

    for (let i = 0; i < total; i++) {
      const file = files[i];
      const progress = Math.round(((i + 1) / total) * 100);
      
      try {
        const result = await this.compressImageFile(file, options);
        results.push(result);
        onProgress?.(progress, file, result);
      } catch (error) {
        console.error(`Erreur de compression pour ${file.name}:`, error);
        onProgress?.(progress, file);
        throw error;
      }
    }

    return results;
  }

  // ============================================
  // 2.10 RESIZE UNIQUEMENT
  // ============================================

  public static async resizeImage(
    file: File,
    width: number,
    height: number,
    quality: number = 0.9
  ): Promise<CompressionResult> {
    return this.compressImageFile(file, {
      maxWidth: width,
      maxHeight: height,
      quality,
      format: 'image/jpeg',
    });
  }

  // ============================================
  // 2.11 CONVERSION FORMAT
  // ============================================

  public static async convertFormat(
    file: File,
    format: 'image/webp' | 'image/jpeg' | 'image/png',
    quality: number = 0.85
  ): Promise<CompressionResult> {
    return this.compressImageFile(file, {
      format,
      quality,
      maxWidth: 4096,
      maxHeight: 4096,
    });
  }

  // ============================================
  // 2.12 OPTIMISATION POUR RÉSEAU
  // ============================================

  public static async optimizeForNetwork(
    file: File,
    targetSizeMB: number = 0.5
  ): Promise<CompressionResult> {
    const targetBytes = targetSizeMB * 1024 * 1024;
    let quality = 0.9;
    let result = await this.compressImageFile(file, { quality });

    // Ajuster la qualité jusqu'à atteindre la taille cible
    while (result.compressedSize > targetBytes && quality > 0.1) {
      quality -= 0.1;
      result = await this.compressImageFile(file, { quality });
    }

    return result;
  }
}

// ============================================
// 3. EXPORT PAR DÉFAUT
// ============================================

export default ImageCompressionService;