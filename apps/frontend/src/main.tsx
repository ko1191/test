import React from 'react';
import ReactDOM from 'react-dom/client';
import { CssBaseline } from '@mui/material';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import App from './App';
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';
import ClientsListPage from './pages/clients/ClientsListPage';
import ClientFormPage from './pages/clients/ClientFormPage';
import InvoicesListPage from './pages/invoices/InvoicesListPage';
import InvoiceFormPage from './pages/invoices/InvoiceFormPage';
import './styles.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <CssBaseline />
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={<HomePage />} />
          <Route path="clients">
            <Route index element={<ClientsListPage />} />
            <Route path="new" element={<ClientFormPage />} />
            <Route path=":clientId" element={<ClientFormPage />} />
          </Route>
          <Route path="invoices">
            <Route index element={<InvoicesListPage />} />
            <Route path="new" element={<InvoiceFormPage />} />
            <Route path=":invoiceId" element={<InvoiceFormPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
