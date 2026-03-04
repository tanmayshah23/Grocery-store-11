import { format, formatDistanceToNow } from 'date-fns';

try {
    console.log('Testing format:');
    console.log(format(Date.now(), 'dd MMM'));
} catch (e) {
    console.error('Format Error:', e.message);
}

try {
    console.log('Testing formatDistanceToNow:');
    console.log(formatDistanceToNow(Date.now()));
} catch (e) {
    console.error('FormatDistance Error:', e.message);
}
