import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Chat from './pages/Chat'
import Dashboard from './pages/Dashboard'
import Accounts from './pages/Accounts'
import Transactions from './pages/Transactions'
import Stats from './pages/Stats'
import ShoppingLists from './pages/ShoppingLists'
import ProductPrices from './pages/ProductPrices'
import PromptLogs from './pages/PromptLogs'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Chat />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/contas" element={<Accounts />} />
        <Route path="/transacoes" element={<Transactions />} />
        <Route path="/estatisticas" element={<Stats />} />
        <Route path="/listas" element={<ShoppingLists />} />
        <Route path="/precos" element={<ProductPrices />} />
        <Route path="/logs" element={<PromptLogs />} />
      </Routes>
    </Layout>
  )
}
