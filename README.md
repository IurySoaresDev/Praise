# Praise App 🎵📖

Sistema profissional de projeção para igrejas, focado em alta fidelidade visual, louvores e passagens bíblicas.

## 🚀 Como Compilar para Windows (Manual)

Se você deseja gerar o executável (`.exe`) na sua própria máquina Windows, siga os passos abaixo:

### 1. Pré-requisitos Obrigatórios

Antes de começar, você precisa instalar as seguintes ferramentas:

1.  **Microsoft Visual Studio C++ Build Tools:**
    *   Baixe através do [Visual Studio Installer](https://visualstudio.microsoft.com/visual-cpp-build-tools/).
    *   Durante a instalação, selecione a carga de trabalho **"Desenvolvimento para desktop com C++"**.
2.  **Rust (Linguagem de Programação):**
    *   Instale o `rustup` através de [rustup.rs](https://rustup.rs/).
    *   Siga as instruções do instalador (selecione a opção padrão indexada como 1).
3.  **Node.js (LTS):**
    *   Instale a versão estável mais recente do [nodejs.org](https://nodejs.org/).
4.  **Tauri CLI:**
    *   Abra o terminal e execute: `npm install -g @tauri-apps/cli`

### 2. Configuração do Projeto

1.  **Clone o Repositório:**
    ```bash
    git clone https://github.com/IurySoaresDev/Praise.git
    cd Praise
    ```

2.  **Instale as Dependências do Frontend:**
    ```bash
    npm install
    ```

### 3. Gerando o Executável (.exe)

Para compilar o projeto e gerar o instalador para Windows:

```bash
npm run tauri build
```

*   O executável final e o instalador (`.msi`) estarão localizados em:
    `src-tauri/target/release/bundle/msi/` or `exe/`

---

## 🏗️ Estrutura do Projeto

*   `/src`: Código fonte da aplicação (React + Vite).
*   `/src-tauri`: Backend e configurações do Tauri (Rust).
*   `/docs`: Imagens de referência e assets brutos.
*   `.github/workflows`: Automação de compilação e release no GitHub.

## 🤖 Release Automática

Este repositório está configurado com **GitHub Actions**. Toda vez que um código é enviado para a branch `main`, o sistema compila automaticamente uma nova versão e a disponibiliza na aba **Releases** do GitHub.

---

## 🛠️ Tecnologias Utilizadas

*   **Frontend:** React 19, Tailwind CSS v4, Lucide Icons, Zustand.
*   **Backend:** Tauri v2 (Rust).
*   **Desktop:** Compatibilidade total com Windows 10/11.

---
*Desenvolvido com foco na excelência e adoração.*