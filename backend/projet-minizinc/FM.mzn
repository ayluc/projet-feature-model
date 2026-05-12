%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%%% FILE INCLUSION


%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%%% FEATURE NODES

% The range of feature ids
set of int: FEATURE;
% Integrity constraint //Les features doivent avoir un ID >= 1
constraint assert(min(FEATURE)==1, "[I1-1] Features must be numbered from 1 onwards");

% The number of features
int: nr_features = card(FEATURE);

% The children cardinality range
set of int: CHILDREN = 0..nr_features;

%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%%% FEATURE TREE

% CHILD NODES
%% `j in children[i]` when `j` is a child of `i`:
%% [C1] `i` *must* be included if `j` is included (and `j` *must* be excluded if `i` is excluded)  ???j doit être inclus si i inclus, faux ?
array[FEATURE] of set of FEATURE: children;

% (Auxiliary) Parent nodes
array[FEATURE] of set of FEATURE: parents = [{i | i in FEATURE where j in children[i]} | j in FEATURE];
% (Auxiliary) Root nodes:
%% `i in roots` when `i` is a root node:
%% [C2] `i` *must* be included
set of FEATURE: roots = {i | i in FEATURE where parents[i]=={}};
% (Auxiliary) Ancestor nodes
array[FEATURE] of set of FEATURE: ancestors = [ancestors(j) | j in FEATURE];
function set of FEATURE: ancestors(FEATURE: j) = array_union([ancestors(i, nr_features-1) | i in parents[j]]); 
function set of FEATURE: ancestors(FEATURE: j, int: height) = if height==0 then {j} else array_union([{j}] ++ [ancestors(i, height-1) | i in parents[j]]) endif; 
% Integrity constraints: the feature graph is a directed tree
constraint assert(forall(j in FEATURE)(not(j in parents[j])), "[I2-1] The feature graph has no loops");
constraint assert(forall(j in FEATURE)(card(parents[j])<=1), "[I2-2] A feature may have at most one parent");
constraint assert(forall(i in FEATURE)(not(i in ancestors[i])), "[I2-3] The feature graph has no cycles");
constraint assert(card(roots)==1, "[I2-4] Exactly one feature is a root node");
% (Auxiliary) Parent node
%% `parent[j]==0` when `j` has no parent
%% `parent[j]==i` with `i in FEATURE` when `j` has parent `i`
array[FEATURE] of CHILDREN: parent = [if parents[j]!={} then min(parents[j]) else 0 endif | j in FEATURE];
% (Auxiliary) Root node
FEATURE: root = min(roots);

% MANDATORY NODES
%% `mandatoryl[j]==1` when `j` is a mandatory node:
%% [C3] Either `j`is the root node, or else `j` *must* be included if its parent is included
array[FEATURE] of 0..1: mandatory;
% Integrity constraints
constraint assert(forall(i in roots)(mandatory[i]==1), "[I3-1] Root features are mandatory");

% CHILDREN CARDINALITY RESTRICTIONS
%% `min_children[i]`:
%% [C4] The minimum number of children of `i` that *must* be included if `i` is included
array[FEATURE] of CHILDREN: min_children;
%% `max_children[i]`:
%% [C5] The maximum number of children of `i` that *must* be included if `i` is included
array[FEATURE] of CHILDREN: max_children;
% Integrity constraints: consistent cardinality bounds
constraint assert(forall(i in FEATURE)(min_children[i]<=max_children[i]), "[I4-1] The lower children cardinality bound must not be strictly greater than the upper bound");
constraint assert(forall(i in FEATURE)(max_children[i]<=card(children[i])), "[I4-2] The upper children cardinality bound must not be strictly greater than the number of children");
constraint assert(forall(i in FEATURE)(card({j | j in children[i] where mandatory[j]==1})<=min_children[i]), "[I4-3] The lower children cardinality bound must not be strictly less than the number of mandatory children");
constraint assert(forall(i in FEATURE where children[i]=={})(max_children[i]==0), "[I4-4] Leaf features have children cardinality bounds set to 0");
% (Auxiliary) Xor-nodes
%% `xor_node[i]==1` when `i` is an xor-node:
%% [C5-1] If `i` is included then exactly one its children *must* be included
array[FEATURE] of 0..1: xor_node = [(min_children[i]==1) * (max_children[i]==1) | i in FEATURE];
% (Auxiliary) Or-nodes
%% `or_node[i]==1` when `i` is an or-node:
%% [C5-2] If `i` is included then none, some or all of its children *may* be included
array[FEATURE] of 0..1: or_node = [(min_children[i]==0) * (max_children[i]==card(children[i])) | i in FEATURE];

%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%%% CROSS-RELATIONS

% DEPENDENT NODES
%% `j in dependents[i]` when `j` depends on `i`:
%% [C6] `j` *must* be included if `i` is included (and `i` *must* be excluded if `j` is excluded) 
array[FEATURE] of set of FEATURE: dependents;
% INCOMPATIBLE NODES
%% `j in incompatibles[i]` when `j` is incompatible with `i`:
%% [C7] `j` *must* be excluded if `i` is included (and `i` *must* be excluded if `j` is included) 
array[FEATURE] of set of FEATURE: incompatibles;
% (Auxiliary) Target nodes
%% `j in targets[i]` when `j` depends on `i` or is incompatible with `i`
array[FEATURE] of set of FEATURE: targets = [dependents[i] union incompatibles[i] | i in FEATURE];
% Integrity constraints
constraint assert(forall(i in FEATURE)(not(i in targets[i])), "[I5-1] No self cross relation");
constraint assert(forall(i,j in FEATURE where j in incompatibles[i])(i in incompatibles[j]), "[I5-2] The incompatibility relation must be symmetric");
constraint assert(forall(i in FEATURE)(dependents[i] intersect incompatibles[i] = {}), "[I5-3] A cross-relation between features is either a dependency or an incompatibility but cannot be both");

%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%%% FEATURE ACTIVATION PROBLEM

% FEATURE ACTIVATION VARIABLES
%% `isActivated[i]==true` when `i` is activated
array[FEATURE] of var bool: isActivated;

% FEATURE ACTIVATION CONSTRAINTS
% [A1] Including a feature activates it
constraint
	forall(i in FEATURE)(
		isActivated[i] <- isIncluded[i]
	);

% [A2] The root is activated
constraint
	forall(i in roots)(
		isActivated[i]
	);


%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%%% FEATURE CONFIGURATION PROBLEM

% FEATURE INCLUSIVENESS VARIABLES
%% `isIncluded[i]==true` when `i` is included in the configuration
array[FEATURE] of var bool: isIncluded;
%% (Auxiliary) `nbIncludedChildrenOfI[i]` counts the children of `i` that are included
array[FEATURE] of var CHILDREN: nbIncludedChildrenOfI = [sum(j in children[i])(isIncluded[j]==1) | i in FEATURE];

% FEATURE INCLUSIVENESS CONSTRAINTS
% [C1] Including a non-root active feature includes its parent (and hence activates it)
constraint
	forall(j in FEATURE where j!=root)(
		isActivated[j] -> (isIncluded[j] -> isIncluded[parent[j]])
	);
	
% [C2] Root features are included
constraint
	forall(i in roots)(
		isIncluded[i]
	);

% [C3] Including an active feature includes all of its mandatory children (and hence activates them)
constraint
	forall(i,j in FEATURE where j in children[i] /\ mandatory[j]==1)(
		isActivated[i] -> (isIncluded[i] -> isIncluded[j])
	);

% [C4-C5] Including an active feature whose children are all active forces the number of included children to satisfy the preset lower and upper cardinality bounds
constraint
	forall(i in FEATURE)(
		(isActivated[i] /\ forall(j in children[i])(isActivated[j])) -> (isIncluded[i] -> (min_children[i]<=nbIncludedChildrenOfI[i] /\ nbIncludedChildrenOfI[i]<=max_children[i]))
	);

% [C6] Including an active feature includes all its dependent features (and hence activates them)
constraint
	forall(i,j in FEATURE where j in dependents[i])(
		isActivated[i] -> (isIncluded[i] -> isIncluded[j])
	);
	
% [C7-1] Including an active feature excludes and also activates all its incompatible features
constraint
	forall(i,j in FEATURE where j in incompatibles[i])(
		isActivated[i] -> (isIncluded[i] -> (not(isIncluded[j]) /\ isActivated[j]))
	);
	
% [C7-2] Excluding an active feature includes (and hence activates) all its incompatible features
constraint
	forall(i,j in FEATURE where j in incompatibles[i])(
		isActivated[i] -> (not(isIncluded[i]) -> isIncluded[j])
%		isActivated[i] -> (not(isIncluded[i]) -> (isIncluded[j] /\ isActivated[j]))
	);
	
% [C8] Inclusion du dernier enfant non activé si le quota minimum d'enfant à inclure n'est pas rempli
	constraint
    forall(i in FEATURE where children[i] != {})(
        (isActivated[i] /\ isIncluded[i] /\
         sum(j in children[i])(isActivated[j]) == card(children[i]) - 1 /\
         nbIncludedChildrenOfI[i] < min_children[i])
        ->
        forall(j in children[i])(
            not(isActivated[j]) -> isIncluded[j]
        )
    );
    
% [C9] Exclusion des autres enfants non activés lorsqu'un des enfants d'un XOR est inclus
constraint
    forall(i in FEATURE, j in children[i])(
        (isActivated[i] /\ isIncluded[i] /\ nbIncludedChildrenOfI[i] >= max_children[i])
        ->
        (isActivated[j])
    );
    
% [C10] Exclusion de la source d'une dépendance si sa target est exclue
constraint
    forall(i in FEATURE, j in dependents[i])(
        (isActivated[j] /\ not(isIncluded[j]))
        ->
        (isActivated[i] /\ not(isIncluded[i]))
    );
   
	
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%%% FEATURE CONFIGURATION GENERATION

% OBJECTIVE
% Minimize the number of activated variables
solve minimize sum(i in FEATURE)(isActivated[i]==1) * (1 + nr_features) + sum(i in FEATURE)(isIncluded[i]==1);

%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%%% FEATURE CONFIGURATION DISPLAY

output
%   ["FEATURES\t\t" ++ show(FEATURE)]
% ++["\n"]
["FEATURES\t\t" ++ show(set2array(FEATURE))]
++["\n"]
++["CHILDREN\t\t" ++ show(children)]
++["\n"]
++["PARENTS\t\t" ++ show(parents)]
++["\n"]
++["ROOTS\t\t" ++ show(roots)]
++["\n"]
++["MANDATORY\t\t" ++ show(mandatory)]
++["\n"]
++["MIN_CHILDREN\t" ++ show(min_children)]
++["\n"]
++["MAX_CHILDREN\t" ++ show(max_children)]
++["\n"]
++["XOR-NODES\t\t" ++ show(xor_node)]
++["\n"]
++["OR-NODES\t\t" ++ show(or_node)]
++["\n"]
++["DEPENDENTS\t\t" ++ show(dependents)]
++["\n"]
++["INCOMPATIBLES\t" ++ show(incompatibles)]
++["\n"]
++["ACTIVATION\t" ++ concat([show(i) ++ ": " ++ show(isActivated[i]) ++ " | " | i in FEATURE])]
++["\n"]
++["\n"]
++["CONFIGURATION\t" ++ concat([show(i) ++ ": " ++ show(isIncluded[i]) ++ " | " | i in FEATURE])]
++["\n"]
;
