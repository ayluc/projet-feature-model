include "FM.mzn";
% constraint iffall(x); % to activate all features => will search for a solution that minimizes the number of included features
constraint x[5]==true; % activates 5
constraint y[5]==false; % excludes 5

