import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';

export default function Header() {
  return (
    <Box>
      <AppBar position="static">
        <Toolbar className='bg-gradient-to-r from-[#4F46E5] to-[#8B5CF6]'>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            <h1 className='font-bold tracking-wider text-2xl'>
              Rifter
            </h1>
          </Typography>
          <Button color="inherit">Login</Button>
        </Toolbar>
      </AppBar>
    </Box>
  );
}