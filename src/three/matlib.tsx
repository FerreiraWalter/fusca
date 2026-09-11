import { CanvasTexture, SRGBColorSpace } from "three";
import { createContext, useContext } from "react";

export const COR = {
  carroceria: "#b0b7c0",
  carroceriaEscura: "#50565b",
  cromo: "#e2eaef",
  vidro: "#0d171c",
  pneu: "#16181b",
  aro: "#d6d2c4",
  motor: "#63665f",
  motorEscuro: "#33342f",
  chapaPreta: "#25282c",
  aluminio: "#b9bfc4",
  cobre: "#b07a45",
  baquelite: "#2a1d18",
  cabo: "#191b1e",
  borracha: "#202225",
  // Tons "de oficina": metais mais limpos, como motor bem cuidado.
  ferroSujo: "#585650",
  ferroSujoEscuro: "#3a3835",
  aluminioSujo: "#9a9c97",
  latao: "#b08842",
  chicote: "#2f3327",
  // Vao do motor: fundicao de aluminio limpa, ferro fosco e borracha preta.
  fundicao: "#747672",
  fundicaoEscura: "#4e504c",
  ferroFosco: "#2d2d2a",
  ferroFoscoEscuro: "#1c1c19",
  ferrugem: "#5c3a24",
  plasticoSujo: "#1a1d1f",
  fioVermelho: "#7a2620",
  fioVerde: "#2c5a3a",
  // Modulo de ignicao verde (fiel a caixa INDUMAG da foto real)
  verdeModulo: "#1a5c38",
  verdeModuloEscuro: "#0f3a22",
  sel: "#ffb300",
  hov: "#37c2ff",
  alerta: "#ff5252",
  ghost: "#37c2ff",
  ok: "#3ddc84",
};

let cachePlacaMercosul: CanvasTexture | null = null;

export function getPlacaMercosulTexture(): CanvasTexture {
  if (cachePlacaMercosul) return cachePlacaMercosul;

  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;

  // Fundo branco
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 512, 256);

  // Borda externa preta
  ctx.strokeStyle = "#111111";
  ctx.lineWidth = 14;
  ctx.strokeRect(7, 7, 498, 242);

  // Faixa azul superior Mercosul
  ctx.fillStyle = "#0033a0";
  ctx.fillRect(7, 7, 498, 64);

  // Texto BRASIL
  ctx.fillStyle = "#ffffff";
  ctx.font = '900 32px "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("BRASIL", 256, 38);

  // Bandeira do Brasil a direita
  ctx.fillStyle = "#009b3a";
  ctx.fillRect(440, 24, 38, 26);
  ctx.fillStyle = "#fedf00";
  ctx.beginPath();
  ctx.moveTo(459, 26);
  ctx.lineTo(476, 37);
  ctx.lineTo(459, 48);
  ctx.lineTo(442, 37);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#002776";
  ctx.beginPath();
  ctx.arc(459, 37, 7, 0, Math.PI * 2);
  ctx.fill();

  // Codigo de Identificacao: DFF3A40
  ctx.fillStyle = "#000000";
  ctx.font = 'bold 104px "Courier New", monospace, sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("WJR7F02", 256, 165);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  cachePlacaMercosul = texture;
  return texture;
}

export interface EstiloPeca {
  sel: boolean;
  hov: boolean;
  ghost: boolean;
  alerta: boolean;
  /** Peca do sistema em foco na visao mecanica. */
  destaque?: boolean;
  /** Peca fora do sistema em foco: recua para o fundo. */
  apagada?: boolean;
}

export const PecaCtx = createContext<EstiloPeca>({
  sel: false,
  hov: false,
  ghost: false,
  alerta: false,
});

export function useEstiloPeca() {
  return useContext(PecaCtx);
}

interface MProps {
  color: string;
  metalness?: number;
  roughness?: number;
  emissive?: string;
  emissiveIntensity?: number;
  transparent?: boolean;
  opacity?: number;
  flatShading?: boolean;
}

/**
 * Material padrao das pecas: aplica sozinho o realce de hover, selecao,
 * alerta e o modo fantasma (posicao de encaixe de uma peca removida).
 */
export function M({
  color,
  metalness = 0.35,
  roughness = 0.6,
  transparent,
  opacity,
  flatShading,
}: MProps) {
  const { sel, hov, ghost, alerta, destaque, apagada } = useEstiloPeca();
  if (ghost) {
    return (
      <meshStandardMaterial
        color={COR.ghost}
        emissive={COR.ghost}
        emissiveIntensity={0.6}
        transparent
        opacity={0.16}
        depthWrite={false}
        wireframe
      />
    );
  }
  const emissive = sel
    ? COR.sel
    : hov
    ? COR.hov
    : alerta
    ? COR.alerta
    : destaque
    ? COR.ok
    : "#000000";
  const emissiveIntensity = sel
    ? 0.5
    : hov
    ? 0.28
    : alerta
    ? 0.3
    : destaque
    ? 0.22
    : 0;
  // Fora do sistema em foco a peca continua visivel, mas para de competir
  // pela atencao: e o equivalente 3D de baixar o volume.
  const desbotada = apagada && !sel && !hov;
  return (
    <meshStandardMaterial
      color={color}
      metalness={metalness}
      roughness={roughness}
      envMapIntensity={0.55}
      emissive={emissive}
      emissiveIntensity={emissiveIntensity}
      transparent={transparent || desbotada}
      opacity={desbotada ? (opacity ?? 1) * 0.22 : opacity}
      depthWrite={desbotada ? false : undefined}
      flatShading={flatShading}
    />
  );
}
