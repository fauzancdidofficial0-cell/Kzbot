const { createCanvas, loadImage } = require("@napi-rs/canvas");
const path = require("path");
const axios = require("axios");

async function generateCard(options) {
  const {
    type,
    username,
    displayName,
    avatarURL,
    memberCount,
    guildName,
    text,
    backgroundURL,
  } = options;

  const WIDTH = 800;
  const HEIGHT = 300;

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  // Background
  try {
    let bg;
    if (backgroundURL) {
      const res = await axios.get(backgroundURL, {
        responseType: "arraybuffer",
      });
      bg = await loadImage(Buffer.from(res.data));
    } else {
      bg = await loadImage(
        path.join(__dirname, "../../assets/backgrounds/welcome_bg.png")
      );
    }
    ctx.drawImage(bg, 0, 0, WIDTH, HEIGHT);
  } catch {
    const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
    if (type === "welcome") {
      gradient.addColorStop(0, "#1a1a2e");
      gradient.addColorStop(1, "#16213e");
    } else {
      gradient.addColorStop(0, "#2d1b1b");
      gradient.addColorStop(1, "#1a0a0a");
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  // Overlay
  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Border
  const accentColor = type === "welcome" ? "#5865f2" : "#ed4245";
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 4;
  ctx.strokeRect(6, 6, WIDTH - 12, HEIGHT - 12);

  // Avatar
  const avatarX = 130;
  const avatarY = HEIGHT / 2;
  const avatarRadius = 85;

  ctx.save();
  ctx.shadowColor = accentColor;
  ctx.shadowBlur = 25;
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarRadius + 5, 0, Math.PI * 2);
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  try {
    const avatarRes = await axios.get(avatarURL + "?size=256", {
      responseType: "arraybuffer",
    });
    const avatar = await loadImage(Buffer.from(avatarRes.data));
    ctx.drawImage(
      avatar,
      avatarX - avatarRadius,
      avatarY - avatarRadius,
      avatarRadius * 2,
      avatarRadius * 2
    );
  } catch {
    ctx.fillStyle = "#2f3136";
    ctx.fillRect(
      avatarX - avatarRadius,
      avatarY - avatarRadius,
      avatarRadius * 2,
      avatarRadius * 2
    );
  }
  ctx.restore();

  // Text
  const textX = 265;

  ctx.font = "bold 38px Sans";
  ctx.fillStyle = accentColor;
  ctx.shadowColor = accentColor;
  ctx.shadowBlur = 15;
  ctx.fillText(type === "welcome" ? "WELCOME!" : "GOODBYE!", textX, 105);
  ctx.shadowBlur = 0;

  ctx.font = "bold 32px Sans";
  ctx.fillStyle = "#ffffff";
  const displayNameText =
    displayName.length > 20
      ? displayName.substring(0, 20) + "..."
      : displayName;
  ctx.fillText(displayNameText, textX, 150);

  ctx.font = "18px Sans";
  ctx.fillStyle = "#b9bbbe";
  ctx.fillText(`@${username}`, textX, 178);

  const parsedText = parseText(text, {
    user: displayName,
    server: guildName,
    count: memberCount,
    username: username,
  });

  ctx.font = "20px Sans";
  ctx.fillStyle = "#dcddde";
  const wrappedText = wrapText(ctx, parsedText, WIDTH - textX - 30, 22);
  wrappedText.forEach((line, i) => {
    ctx.fillText(line, textX, 215 + i * 26);
  });

  // Member count badge
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  roundRect(ctx, textX, 255, 220, 30, 8);
  ctx.fill();
  ctx.font = "bold 15px Sans";
  ctx.fillStyle = "#b9bbbe";
  const countText =
    type === "welcome"
      ? `Member #${memberCount}`
      : `Members remaining: ${memberCount}`;
  ctx.fillText(countText, textX + 10, 275);

  return canvas.toBuffer("image/png");
}

function parseText(text, vars) {
  return text
    .replace(/{user}/gi, vars.user)
    .replace(/{username}/gi, vars.username)
    .replace(/{server}/gi, vars.server)
    .replace(/{count}/gi, vars.count);
}

function wrapText(ctx, text, maxWidth, lineHeight) {
  const words = text.split(" ");
  const lines = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(currentLine + " " + word).width;
    if (width < maxWidth) {
      currentLine += " " + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  return lines;
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

module.exports = { generateCard };
