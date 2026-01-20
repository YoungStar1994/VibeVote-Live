import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Voter from './components/Voter'
import Screen from './components/Screen'
import Admin from './components/Admin'
import './index.css'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Screen />} />
        <Route path="/vote" element={<Voter />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </Router>
  )
}

export default App
