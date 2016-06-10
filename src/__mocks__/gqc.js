jest.unmock('../gqc');
import gqc from '../gqc';

gqc.typeComposer('User');
gqc.__mockExistedType = 'User';

export default gqc;
