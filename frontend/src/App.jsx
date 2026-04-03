import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { LangProvider } from './context/LangContext'
import { isAuthenticated, getUser } from './utils/auth'
import LoginPage from './pages/LoginPage'
import ChatPage from './pages/ChatPage'
import UserManagementPage from './pages/UserManagementPage'

function PrivateRoute({ element }) {
  return isAuthenticated() ? element : <Navigate to="/login" replace />
}

function PublicRoute({ element }) {
  return isAuthenticated() ? <Navigate to="/chat" replace /> : element
}

function ParentRoute({ element }) {
  if (!isAuthenticated()) return <Navigate to="/login" replace />
  if (getUser()?.role !== 'parent') return <Navigate to="/chat" replace />
  return element
}

function App() {
  return (
    <LangProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<PublicRoute element={<LoginPage />} />} />
          <Route path="/chat" element={<PrivateRoute element={<ChatPage />} />} />
          <Route path="/users" element={<ParentRoute element={<UserManagementPage />} />} />
        </Routes>
      </BrowserRouter>
    </LangProvider>
  )
}

export default App
