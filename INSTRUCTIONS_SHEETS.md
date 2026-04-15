# Configuração do Google Sheets

Para integrar este aplicativo com o seu Google Planilhas, siga os passos abaixo:

### Opção 1: Google Apps Script (Recomendado para Escrita)

1. Crie uma nova Planilha Google.
2. Crie as abas: `Financeiro`, `Calendário`, `Tarefas`, `Clientes`.
3. Vá em **Extensões > Apps Script**.
4. Cole o código do arquivo `scripts/google-apps-script.js` (que será criado no projeto).
5. Clique em **Implantar > Nova Implantação**.
6. Selecione **App da Web**, configure para que **Qualquer pessoa** tenha acesso.
7. Copie a URL gerada e adicione ao seu arquivo `.env`:
   `VITE_GOOGLE_SCRIPT_URL="SUA_URL_AQUI"`

### Opção 2: API do Google Sheets (Apenas Leitura ou Configuração Complexa)

1. Obtenha uma Chave de API no Google Cloud Console.
2. Adicione ao seu arquivo `.env`:
   `VITE_GOOGLE_SHEETS_API_KEY="SUA_CHAVE_AQUI"`
   `VITE_GOOGLE_SHEET_ID="ID_DA_SUA_PLANILHA"`

---

**Nota:** Por padrão, o aplicativo usa o `localStorage` para que você possa testar a interface imediatamente sem configuração.
