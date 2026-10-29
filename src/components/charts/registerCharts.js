import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js';

// Registers only the Chart.js parts used by PaisaPilot charts.
ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);
