import React, { useState, useEffect, useRef } from 'react';
import { Plus, TrendingUp, TrendingDown, Filter, Download, Trash2, Pencil, Copy, ExternalLink, CheckCircle2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { googleSheetsService } from '../services/dataService';
import { Transaction } from '../types';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function Finance() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const workbookRef = useRef<XLSX.WorkBook | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newTransaction, setNewTransaction] = useState<Partial<Transaction>>({
    type: 'income',
    date: new Date().toISOString().split('T')[0],
    category: 'Geral'
  });

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoading(true);
      const data = await googleSheetsService.fetchData('Financeiro');
      if (isMounted) {
        const sortedData = [...data].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setTransactions(sortedData);
        setLoading(false);
      }
    };
    load();
    return () => { isMounted = false; };
  }, []);

  async function loadTransactions() {
    setLoading(true);
    const data = await googleSheetsService.fetchData('Financeiro');
    const sortedData = [...data].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setTransactions(sortedData);
    setLoading(false);
  }

  async function handleAddTransaction(e: React.FormEvent) {
    e.preventDefault();
    const transaction: Transaction = {
      id: editingId || Math.random().toString(36).substr(2, 9),
      ...newTransaction as Transaction,
      amount: Number(newTransaction.amount)
    };
    
    if (editingId) {
      await googleSheetsService.updateData('Financeiro', transaction);
    } else {
      await googleSheetsService.appendData('Financeiro', transaction);
    }
    
    setShowAddModal(false);
    setEditingId(null);
    loadTransactions();
    setNewTransaction({
      type: 'income',
      date: new Date().toISOString().split('T')[0],
      category: 'Geral'
    });
  }

  function handleEdit(transaction: Transaction) {
    setEditingId(transaction.id);
    setNewTransaction(transaction);
    setShowAddModal(true);
  }

  async function handleDeleteTransaction(id: string) {
    await googleSheetsService.deleteData('Financeiro', id);
    loadTransactions();
  }

  function handleExport() {
    if (transactions.length === 0) return;
    setExporting(true);

    try {
      // Prepare data for Excel
      const data = transactions.map(t => ({
        'Data': formatDate(t.date),
        'Tipo': t.type === 'income' ? 'Entrada' : 'Saída',
        'Descrição': t.description,
        'Categoria': t.category,
        'Valor (R$)': t.amount
      }));

      // Create Worksheet
      const worksheet = XLSX.utils.json_to_sheet(data);
      
      // Set column widths
      const wscols = [
        { wch: 12 }, { wch: 10 }, { wch: 30 }, { wch: 15 }, { wch: 15 },
      ];
      worksheet['!cols'] = wscols;

      // Create Workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Financeiro");
      workbookRef.current = workbook;

      const fileName = `financeiro_${new Date().toISOString().split('T')[0]}.xlsx`;
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

      if (isMobile) {
        // On mobile, show the enhanced modal
        setShowExportModal(true);
        setExporting(false);
      } else {
        // On desktop, use the library's built-in download trigger
        XLSX.writeFile(workbook, fileName);
        setExporting(false);
      }
    } catch (error) {
      console.error('Export failed:', error);
      setExporting(false);
      alert('Erro ao gerar planilha. Tente novamente.');
    }
  }

  const handleDownloadClick = () => {
    if (!workbookRef.current) return;
    const fileName = `financeiro_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    try {
      XLSX.writeFile(workbookRef.current, fileName);
      // Don't close immediately to let the user see it's working
      setTimeout(() => setShowExportModal(false), 2000);
    } catch (e) {
      console.error('Download failed', e);
      alert('O download falhou. Tente usar a opção de compartilhar ou copiar.');
    }
  };

  const handleShareClick = async () => {
    if (!workbookRef.current) return;
    const fileName = `financeiro_${new Date().toISOString().split('T')[0]}.xlsx`;

    try {
      const excelBuffer = XLSX.write(workbookRef.current, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const file = new File([blob], fileName, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Exportação Financeira',
          text: 'Planilha Excel exportada do CéliaVip'
        });
        setShowExportModal(false);
      } else {
        // Fallback: try opening the blob URL directly
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      }
    } catch (e) {
      console.error('Share failed', e);
      handleDownloadClick(); // Fallback to direct download
    }
  };

  const handleCopyAsCsv = () => {
    if (transactions.length === 0) return;
    
    const headers = ['Data', 'Tipo', 'Descrição', 'Categoria', 'Valor'];
    const rows = transactions.map(t => [
      formatDate(t.date),
      t.type === 'income' ? 'Entrada' : 'Saída',
      t.description,
      t.category,
      t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.join(';'))
    ].join('\n');

    navigator.clipboard.writeText(csvContent).then(() => {
      setCopySuccess(true);
      setTimeout(() => {
        setCopySuccess(false);
        setShowExportModal(false);
      }, 2000);
    });
  };

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((acc, curr) => acc + Number(curr.amount), 0);
  
  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  return (
    <div className="space-y-6 sm:space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Financeiro</h1>
          <p className="text-sm sm:text-base text-slate-500">Gerencie suas receitas e despesas com facilidade.</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button 
            onClick={handleExport}
            disabled={exporting}
            className={cn(
              "flex-1 sm:flex-none p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 transition-all flex items-center justify-center gap-2 active:scale-95",
              exporting && "opacity-50 cursor-not-allowed"
            )}
            title="Exportar Planilha"
          >
            <Download size={20} className={cn(exporting && "animate-bounce")} />
            <span className="hidden xs:inline">{exporting ? 'Exportando...' : 'Exportar'}</span>
          </button>
          <button className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 transition-all active:scale-95">
            <Filter size={20} />
          </button>
          <button 
            onClick={() => {
              setEditingId(null);
              setNewTransaction({
                type: 'income',
                date: new Date().toISOString().split('T')[0],
                category: 'Geral'
              });
              setShowAddModal(true);
            }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-semibold transition-all shadow-lg shadow-indigo-200 dark:shadow-none active:scale-95"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">Novo Registro</span>
            <span className="sm:hidden">Novo</span>
          </button>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-emerald-500 p-6 rounded-3xl text-white shadow-lg shadow-emerald-100 dark:shadow-none">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-white/20 rounded-xl">
              <TrendingUp size={24} />
            </div>
            <span className="text-sm font-medium opacity-80">Entradas</span>
          </div>
          <h2 className="text-3xl font-bold">{formatCurrency(totalIncome)}</h2>
        </div>
        <div className="bg-rose-500 p-6 rounded-3xl text-white shadow-lg shadow-rose-100 dark:shadow-none">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-white/20 rounded-xl">
              <TrendingDown size={24} />
            </div>
            <span className="text-sm font-medium opacity-80">Saídas</span>
          </div>
          <h2 className="text-3xl font-bold">{formatCurrency(totalExpense)}</h2>
        </div>
        <div className="bg-indigo-600 p-6 rounded-3xl text-white shadow-lg shadow-indigo-100 dark:shadow-none">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-white/20 rounded-xl">
              <TrendingUp size={24} />
            </div>
            <span className="text-sm font-medium opacity-80">Saldo Total</span>
          </div>
          <h2 className="text-3xl font-bold">{formatCurrency(totalIncome - totalExpense)}</h2>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-semibold">Últimas Transações</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-4 md:px-6 py-4 font-semibold hidden md:table-cell">Data</th>
                <th className="px-4 md:px-6 py-4 font-semibold">Descrição</th>
                <th className="px-4 md:px-6 py-4 font-semibold hidden sm:table-cell">Categoria</th>
                <th className="px-4 md:px-6 py-4 font-semibold">Valor</th>
                <th className="px-4 md:px-6 py-4 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {transactions.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 md:px-6 py-4 text-sm text-slate-500 hidden md:table-cell">{formatDate(t.date)}</td>
                  <td className="px-4 md:px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-2 h-2 rounded-full flex-shrink-0",
                        t.type === 'income' ? "bg-emerald-500" : "bg-rose-500"
                      )} />
                      <div className="flex flex-col">
                        <span className="font-medium line-clamp-1">{t.description}</span>
                        <span className="text-[10px] text-slate-400 md:hidden">{formatDate(t.date)}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 md:px-6 py-4 hidden sm:table-cell">
                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-medium text-slate-600 dark:text-slate-400">
                      {t.category}
                    </span>
                  </td>
                  <td className={cn(
                    "px-4 md:px-6 py-4 font-semibold whitespace-nowrap",
                    t.type === 'income' ? "text-emerald-600" : "text-rose-600"
                  )}>
                    {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount)}
                  </td>
                  <td className="px-4 md:px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1 md:gap-2">
                      <button 
                        onClick={() => handleEdit(t)}
                        className="p-2 text-slate-400 hover:text-indigo-500 transition-colors"
                        title="Editar"
                      >
                        <Pencil size={18} />
                      </button>
                      <button 
                        onClick={() => handleDeleteTransaction(t.id)}
                        className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    Nenhuma transação encontrada. Comece adicionando uma!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-xl font-bold">{editingId ? 'Editar Registro' : 'Novo Registro'}</h3>
                <button 
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingId(null);
                    setNewTransaction({
                      type: 'income',
                      date: new Date().toISOString().split('T')[0],
                      category: 'Geral'
                    });
                  }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  &times;
                </button>
              </div>
              <form onSubmit={handleAddTransaction} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setNewTransaction({...newTransaction, type: 'income'})}
                    className={cn(
                      "py-2 rounded-xl text-sm font-semibold transition-all",
                      newTransaction.type === 'income' ? "bg-white dark:bg-slate-700 text-emerald-600 shadow-sm" : "text-slate-500"
                    )}
                  >
                    Receita
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewTransaction({...newTransaction, type: 'expense'})}
                    className={cn(
                      "py-2 rounded-xl text-sm font-semibold transition-all",
                      newTransaction.type === 'expense' ? "bg-white dark:bg-slate-700 text-rose-600 shadow-sm" : "text-slate-500"
                    )}
                  >
                    Despesa
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-500">Descrição</label>
                  <input
                    required
                    type="text"
                    value={newTransaction.description || ''}
                    onChange={(e) => setNewTransaction({...newTransaction, description: e.target.value})}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Ex: Aluguel, Salário..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-500">Valor</label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      value={newTransaction.amount || ''}
                      onChange={(e) => setNewTransaction({...newTransaction, amount: Number(e.target.value)})}
                      className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="0,00"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-500">Data</label>
                    <input
                      required
                      type="date"
                      value={newTransaction.date || ''}
                      onChange={(e) => setNewTransaction({...newTransaction, date: e.target.value})}
                      className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-500">Categoria</label>
                  <select
                    value={newTransaction.category || 'Geral'}
                    onChange={(e) => setNewTransaction({...newTransaction, category: e.target.value})}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Geral">Geral</option>
                    <option value="Alimentação">Alimentação</option>
                    <option value="Transporte">Transporte</option>
                    <option value="Lazer">Lazer</option>
                    <option value="Saúde">Saúde</option>
                    <option value="Educação">Educação</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-semibold hover:bg-slate-200 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none"
                  >
                    {editingId ? 'Atualizar' : 'Salvar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Export Modal for Mobile */}
      <AnimatePresence>
        {showExportModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] shadow-2xl p-6 sm:p-8 text-center border border-slate-200 dark:border-slate-800"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-6">
                {copySuccess ? <CheckCircle2 size={40} className="text-emerald-500" /> : <Download size={40} />}
              </div>
              
              <h3 className="text-xl sm:text-2xl font-bold mb-2 text-slate-900 dark:text-white">
                {copySuccess ? 'Copiado!' : 'Exportar Planilha'}
              </h3>
              <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mb-8">
                {copySuccess 
                  ? 'Os dados foram copiados. Você pode colá-los no Excel ou Google Sheets.'
                  : 'Escolha como deseja receber sua planilha Excel.'}
              </p>
              
              {!copySuccess && (
                <div className="space-y-3">
                  <button 
                    onClick={handleShareClick}
                    className="flex items-center justify-center gap-3 w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-indigo-200 dark:shadow-none"
                  >
                    <Plus size={20} className="rotate-45" />
                    Compartilhar / Salvar
                  </button>

                  <button 
                    onClick={handleDownloadClick}
                    className="flex items-center justify-center gap-3 w-full py-4 bg-white dark:bg-slate-800 border-2 border-indigo-100 dark:border-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl font-bold transition-all"
                  >
                    <Download size={20} />
                    Baixar Arquivo
                  </button>
                  
                  <button 
                    onClick={handleCopyAsCsv}
                    className="flex items-center justify-center gap-3 w-full py-4 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 rounded-2xl font-semibold transition-all"
                  >
                    <Copy size={18} />
                    Copiar como Texto (CSV)
                  </button>

                  <div className="pt-4 flex items-center justify-center gap-2 text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                    <ExternalLink size={12} />
                    Dica: Use o Chrome ou Safari
                  </div>

                  <button 
                    onClick={() => setShowExportModal(false)}
                    className="w-full py-2 text-slate-400 dark:text-slate-500 font-medium transition-all text-xs mt-2"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
