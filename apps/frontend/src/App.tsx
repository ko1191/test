import { AppBar, Box, Button, Container, Stack, Toolbar, Typography } from '@mui/material';
import { Link as RouterLink, Outlet } from 'react-router-dom';

function App() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar sx={{ gap: 2 }}>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Invoicing System
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button color="inherit" component={RouterLink} to="/">
              Dashboard
            </Button>
            <Button color="inherit" component={RouterLink} to="/clients">
              Clients
            </Button>
            <Button color="inherit" component={RouterLink} to="/invoices">
              Invoices
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>
      <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
        <Container maxWidth="lg">
          <Outlet />
        </Container>
      </Box>
      <Box component="footer" sx={{ py: 2, bgcolor: 'grey.100' }}>
        <Container maxWidth="lg">
          <Typography variant="body2" color="text.secondary" align="center">
            © {new Date().getFullYear()} Invoicing System
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}

export default App;
