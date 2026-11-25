# ⚔️ Total Tracking — Desktop Companion & Campaign Tracker para Total War: WARHAMMER III

Aplicação Desktop nativa para Windows (estilo **Ludohall + Bloons TD 6**) focada no rastreamento de campanhas, sessões de jogo e estatísticas dos **110 Lordes Lendários de Total War: WARHAMMER III** (com arquitetura multi-jogo preparada para Shogun 2, Rome II e Three Kingdoms).

---

## 🚀 Como Iniciar

### 1. Início Rápido (1 Clique no Windows)
Dê um duplo clique no arquivo:
```
total-tracking\iniciar-total-tracking.bat
```
Ele compilará a aplicação e abrirá o Total Tracking com suporte à **Bandeja do Sistema (System Tray)**.

### 2. Modo Desenvolvimento
```bash
cd total-tracking
npm run dev
```

### 3. Gerar Instalador Executável (.exe)
```bash
cd total-tracking
npm run dist
```
O executável de instalação (`.exe`) será gerado na pasta `total-tracking\release`.

---

## 🛠️ Tecnologias Utilizadas
- **Desktop Core:** Electron v35 (Node.js) com consumo mínimo de recursos em segundo plano e integração nativa com o Windows (System Tray, Process Watcher, File Watcher).
- **Front-end (UI):** React 19 + TypeScript + Vite + Tailwind CSS v4, mantendo a estética *All Black* (`#070709`), superfícies escuras e bordas metálicas BTD6.
- **Back-end & Cloud Sync:** Supabase (PostgreSQL + RLS + Auth) com cache local no `localStorage` para funcionamento *offline-first*.

---

## ⚡ Automações Locais do Windows Implementadas

### A. Monitoramento de Processo (`Warhammer3.exe`)
- O serviço em background `ProcessWatcher` verifica a cada 3 segundos os processos do Windows (`tasklist`).
- **Auto-Play / Auto-Pause:**
  - Ao iniciar `Warhammer3.exe` com uma campanha ativa em andamento, o cronômetro inicia automaticamente (`Date.now()`).
  - Ao encerrar `Warhammer3.exe`, o cronômetro é pausado e a sessão é gravada em `play_sessions` com a tag `autoDetected: true`.
  - Nas Configurações, há chaves para alternar entre "Auto-Play via Processo" e "Cronômetro Manual".

### B. Monitoramento da Pasta de Saves (`SaveWatcher`)
- Monitora em tempo real via `chokidar` os diretórios:
  - `%APPDATA%\The Creative Assembly\Warhammer3\save_games` (Steam)
  - `%APPDATA%\The Creative Assembly\Warhammer3\EOS\save_games` (Epic Games)
- **Extração Automática de Metadados:**
  - Extrai a facção, o Lorde Lendário correspondente e o **Turno Atual** a partir do nome do arquivo (`The Northern Provinces_Auto-save.193110045910.save` -> Miao Ying #70, Turno 19).
  - Reconhece a convenção de troféu (ex.: `001_KarlFranz_Bronze_T48.save`) e sugere/marca a medalha automaticamente.

### C. Sistema na Barra de Apps Abertos (System Tray)
- Roda em segundo plano com ícone de escudo dourado na bandeja do Windows (ao lado do relógio, estilo Kaspersky / Wallpaper Engine).
- Menu de contexto na bandeja:
  - Status do `Warhammer3.exe` (Em Execução / Fechado)
  - Restaurar janela / Minimizar para a bandeja
  - Encerrar completamente

---

## 🛡️ Sistema de Medalhas & Bordas (Estilo Bloons TD 6)
1. **Sem tentativa:** Card escuro padrão com borda metálica sutil.
2. **Em Campanha:** Borda pulsante azul/âmbar com animação neon.
3. **Vitória Curta (Bronze):** Borda metálica bronze (`#cd7f32`).
4. **Vitória Longa (Prata):** Borda metálica prata (`#d1d5db`).
5. **Crise Final / Dominação (Ouro):** Borda metálica dourada com glow (`#ffd700`).
6. **Borda Preta (100% Batalhas Manuais + Sem Reload):** Moldura *Obsidian* com duplo aro dourado e aura pulsante mística roxa (`#a855f7`).

---

## 📊 Dashboard de Estatísticas (Estilo Ludohall)
- **KPIs Globais:** Tempo total jogado, Dias únicos jogados (tratados em UTC para evitar distorções de fuso horário), Progresso da Maratona (X/110), Win Rate (V/D), Média de horas por vitória e Minutos por turno.
- **Hall da Fama:** Vitória Mais Rápida, Campanha Mais Longa, Nêmesis (Lord com mais derrotas/reinícios) e Mestre da Velocidade (menor min/turno).
- **Gráficos e Tabelas:** Progresso por Eras (WH1, WH2, WH3) e tabela ordenável por Facção.

---

## 🗄️ Modelagem do Banco de Dados (Supabase / PostgreSQL)
O arquivo de migração está disponível em:
```
total-tracking\supabase\schema.sql
```
Basta abrir o painel do seu novo projeto no Supabase, ir em **SQL Editor** e colar o conteúdo de `schema.sql`.

As tabelas suportam múltiplos títulos da franquia Total War:
- `games`: `id`, `slug` (`wh3`, `shogun2`, `rome2`, `three_kingdoms`), `name`
- `factions`: `id`, `game_id`, `name`, `color_hex`, `race`
- `lords`: `id`, `game_id`, `faction_id`, `chrono_number` (1..110), `name`, `era`, `wave`, `dlc_name`, `wiki_title`
- `lord_progress`: `user_id`, `lord_id`, `short_victory`, `long_victory`, `crisis_victory`, `black_border`
- `campaign_runs`: `id`, `user_id`, `lord_id`, `status`, `difficulty`, `final_turn`, `start_date`, `end_date`, `manual_days`, `total_seconds`, `is_black_border_eligible`
- `play_sessions`: `id`, `user_id`, `run_id`, `lord_id`, `started_at`, `ended_at`, `duration_seconds`, `turn_reached`, `auto_detected`


---

## ⚖️ Aviso Legal & Direitos Autorais (Fan Project Disclaimer)
**Total Tracking** é um projeto de código aberto, gratuito e sem fins lucrativos desenvolvido pela comunidade de fãs. 
- **Total War: WARHAMMER** e todos os seus logotipos, nomes de facções, personagens, unidades e imagens associadas são marcas registradas e propriedade intelectual exclusiva da **Games Workshop Ltd.** e **SEGA / Creative Assembly**.
- Este software não é oficial, não é afiliado e não é endossado pela Creative Assembly, SEGA ou Games Workshop.
