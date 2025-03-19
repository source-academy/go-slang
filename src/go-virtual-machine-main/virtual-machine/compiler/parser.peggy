{{
  import {
    IntegerLiteralToken,
    FloatLiteralToken,
    StringLiteralToken,
    BinaryOperator,
    UnaryOperator,
    SourceFileTokens,
    ImportToken,
    FunctionDeclarationToken,
    VariableDeclarationToken,
    ConstantDeclarationToken,
    TypeDeclarationToken,
    PrimaryExpressionToken,
    AssignmentStatementToken,
    IdentifierToken,
    ShortVariableDeclarationToken,
    IncDecStatementToken,
    ReturnStatementToken,
    BreakStatementToken,
    ContinueStatementToken,
    FallthroughStatementToken,
    IfStatementToken,
    BlockToken,
    ForStatementToken,
    DeferStatementToken,
    PrimitiveTypeToken,
    DeclaredTypeToken,
    ArrayTypeToken,
    SliceTypeToken,
    StructTypeToken,
    FunctionTypeToken,
    MapTypeToken,
    ChannelTypeToken,
    SelectorToken,
    IndexToken,
    SliceToken,
    CallToken,
    SwitchCaseToken,
    SwitchStatementToken,
    FunctionLiteralToken,
    GoStatementToken,
    SendStatementToken,
    ReceiveStatementToken,
    CommunicationClauseToken,
    SelectStatementToken,
    BuiltinCallToken,
    LiteralValueToken,
    ArrayLiteralToken,
    SliceLiteralToken,
    StructLiteralToken,
    PointerTypeToken,
    QualifiedIdentifierToken,
  } from './tokens'

  // Returns an AST with left to right precedence
  function leftPrecTree(rest, right) {
    if (!rest.length) return right
    let last = rest.pop()
    return last[2](leftPrecTree(rest, last[0]), right)
  }
}}

/*
The result of parsing a source file should be a single list of tokens,
which we shall call it SourceFileTokens.
A token may be composed of many other tokens.
The structure of what each token looks like can be found in each Token class.
*/

//* =============== Root ===============
start = _ @SourceFile _


//* =============== Whitespace ===============
// By convention, _ is used to eat up whitespace.
_ = ([ \t\r\n] / comment)*





//* =============== Source Code Representation ===============
//* Characters
newline = "\n"
unicode_char   = char:. &{ return char != "\n" }
unicode_letter = char:. &{ return char.match(/^\p{L}$/u) }
unicode_digit  = char:. &{ return char.match(/^\p{N}$/u) }

//* Letters and Digits
letter        = unicode_letter / "_"
decimal_digit = [0-9]
binary_digit  = [0-1]
octal_digit   = [0-7]
hex_digit     = [0-9a-fA-F]





//* =============== Lexical Elements ===============
comment = "//" unicode_char* newline
        / "/*" (!"*/" .)* "*/"

//* Identifiers
identifier = iden:$(letter (letter / unicode_digit)*) &{ return IdentifierToken.isValidIdentifier(iden) }
             { return new IdentifierToken(location(), iden) }
// lookahead "&" for a newline, insert a semicolon

//* Integer Literals
int_lit = number:binary_lit  { return IntegerLiteralToken.fromSource(location(), number[3], 2) }  /
          number:octal_lit   { return IntegerLiteralToken.fromSource(location(), number[3], 8) }  /
          number:hex_lit     { return IntegerLiteralToken.fromSource(location(), number[3], 16) } /
          number:decimal_lit { return IntegerLiteralToken.fromSource(location(), number, 10) }
binary_lit  = "0" [bB] "_"? $binary_digits+
octal_lit   = "0" [oO] "_"? $octal_digits+
decimal_lit = $([1-9] "_"? decimal_digits?) /
              "0"
hex_lit     = "0" [xX] "_"? $hex_digits+

binary_digits  = binary_digit  ("_"? binary_digit)*
octal_digits   = octal_digit   ("_"? octal_digit)*
decimal_digits = decimal_digit ("_"? decimal_digit)*
hex_digits     = hex_digit     ("_"? hex_digit)*

//* Floating-point Literals
//! TODO (P5): Support hexadecimal floating points.
float_lit = number:$decimal_float_lit { return FloatLiteralToken.fromSource(location(), number); }

decimal_float_lit = decimal_digits "." decimal_digits? decimal_exponent? /
                    decimal_digits decimal_exponent /
                    "." decimal_digits decimal_exponent?
decimal_exponent  = [eE] ("+" / "-")? decimal_digits

//! TODO (P5): Support imaginary literals.
//! TODO (P3): Support rune literals.

//* String Literals
string_lit             = raw_string_lit / interpreted_string_lit
raw_string_lit         = "`" str:$[^`]* "`" { return StringLiteralToken.fromSourceRaw(location(), str) }
interpreted_string_lit = '"' str:$[^\n"]* '"' { return StringLiteralToken.fromSourceInterpreted(location(), str) }
//! TODO (P3): Interpreted string literals should interpret rune literals.





//* =============== Types ===============
// Note: `TypeName TypeArgs?` is reduced to `TypeName` as generics are not supported.
Type     = @TypeLit / TypeName / "(" _ Type _ ")"
//! TODO (P1): Support qualified identifiers for TypeName.
TypeName = @QualifiedIdent /
           (iden:identifier
           { return PrimitiveTypeToken.isPrimitive(iden.identifier)
            ? new PrimitiveTypeToken(location(), iden.identifier) 
            : new DeclaredTypeToken(location(), iden.identifier)})
TypeLit  = ArrayType / StructType / PointerType / FunctionType / InterfaceType / SliceType / MapType / ChannelType

//* Array Types
ArrayType   = "[" _ length:ArrayLength _ "]" element:ElementType { return new ArrayTypeToken(location(), element, length) }
// Note: ArrayLength is actually an Expression in Golang specification, but we didn't want to implement
// expression evaluation INSIDE the compiler. Hence, we chose to only allow int_lit.
ArrayLength = int_lit
ElementType = Type

//* Slice Types
SliceType = "[" "]" element:ElementType { return new SliceTypeToken(location(), element) }

//* Struct Types
StructType    = "struct" _ "{" _ fields:(_ @FieldDecl _ ";"? _)* "}" { return new StructTypeToken(location(), [...fields].flat()) }
FieldDecl     = list:IdentifierList _ type:(Type / EmbeddedField) _ Tag? { return {list, type} }
EmbeddedField = "*"? TypeName
Tag           = string_lit

//* Pointer Types
PointerType = "*" type:BaseType {return new PointerTypeToken(location(), type)}
BaseType = Type

//* Function Types
FunctionType  = "func" _ @Signature
Signature     = params:Parameters _ result:Result? { return new FunctionTypeToken(location(), params, result) }
Result        = @Parameters / type:Type { return [{ type }] }
// Parameters is an array of { identifier?: string, type: TypeToken }.
Parameters    = "(" _ parameters:ParameterList? _ ","? _ ")" { return parameters ?? [] }
ParameterList = head:ParameterDecl tail:(_ "," _ @ParameterDecl)* { return [head, ...tail].flat()}
// Note: ParameterDecl does not support variadic parameters (i.e. no `xs ...int`).
ParameterDecl = identifiers:IdentifierList? _ type:Type
                { return identifiers == null || identifiers.length === 0
                         ? [{ identifier: null, type }]
                         : identifiers.map(iden => ({ identifier: iden.identifier, type })) }
                / type:Type { return [{ identifier: null, type }] }

//* Interface Types
InterfaceType  = "interface" _ "{" _ (_ InterfaceElem _ ";"?)* _ "}"
InterfaceElem  = MethodElem / TypeElem
MethodElem     = MethodName _ Signature
MethodName     = identifier
TypeElem       = TypeTerm _ ("|" _ TypeTerm _)*
TypeTerm       = Type / UnderlyingType
UnderlyingType = "~" Type

//* Map Types
MapType = "map" _ "[" _ key:KeyType _ "]" _ element:ElementType { return new MapTypeToken(location(), key, element) }
KeyType = Type

//* Channel Types
ChannelType = "chan" _ "<-" _ element:ElementType { return new ChannelTypeToken(location(), element, false, true) }
              / "<-" _ "chan" _ element:ElementType { return new ChannelTypeToken(location(), element, true, false) }
              / "chan" _ element:ElementType { return new ChannelTypeToken(location(), element, true, true) }





//* =============== Blocks ===============
CompositeLitContext = !"func" Type _ "{"
Block = !CompositeLitContext "{" _ statements:StatementList _ "}" { return new BlockToken(location(), statements) }
StatementList = (_ @Statement _ ";"?)*





//* =============== Declarations and Scope ===============
//! TODO (P5): Tokenize TypeDecl.
Declaration  = ConstDecl / TypeDecl / VarDecl
//! TODO (P4): Tokenize MethodDecl.
TopLevelDecl = Declaration / FunctionDecl / MethodDecl

//* Constant Declarations
//! TODO (P5): Multiple declarations (optionally semicolon-separated) is not supported.
ConstDecl      = "const" _ @ConstSpec
ConstSpec      = identifiers:IdentifierList _ rest:(
                    varType:Type? _ "=" _ expressions:ExpressionList
                    { return { varType, expressions } }
                 )
                 { return new ConstantDeclarationToken(location(), identifiers, rest.expressions, rest.varType) }

IdentifierList = head:identifier tail:(_ "," _ @identifier _)* { return [head, ...tail] }
ExpressionList = head:Expression tail:(_ "," _ @Expression _)* { return [head, ...tail] }

//* Type Declarations
TypeDecl  = "type" _ @(TypeSpec / "(" _ (_ TypeSpec _ ";"?)* _ ")")
TypeSpec  = AliasDecl / TypeDef
AliasDecl = identifier _ "=" _ Type
TypeDef   = identifier:identifier _ TypeParameters? _ type:Type { return new TypeDeclarationToken(location(), identifier, type, undefined) }
TypeParameters = "[" _ TypeParamList _ ","? _ "]"
TypeParamList  = TypeParamDecl (_ "," _ TypeParamDecl)*
TypeParamDecl  = IdentifierList _ TypeConstraint
TypeConstraint = TypeElem

//* Variable Declarations
//! TODO (P5): Multiple declarations (optionally semicolon-separated) is not supported.
VarDecl = "var" _ @VarSpec
VarSpec = identifiers:IdentifierList _ rest:(
            varType:Type expressions:(_ "=" _ @(ExpressionList / &CompositeLitContext CompositeLit))? 
            { return {varType, expressions} }
            /
            _ "=" _ expressions:(ExpressionList / CompositeLit)
            { return {varType: undefined, expressions} }
          )
          { return new VariableDeclarationToken(location(), identifiers, rest.varType, rest.expressions) }

//* Short Variable Declarations
ShortVarDecl = identifiers:IdentifierList _ ":=" _ expressions:(ExpressionList / CompositeLit)
               { return new ShortVariableDeclarationToken(location(), identifiers, undefined, expressions) }

//* Function Declarations
// Note: TypeParameters? is omitted from FunctionDecl as we do not support generics.
FunctionDecl = "func" _ name:FunctionName _ signature:Signature _ body:Block?
               { return new FunctionDeclarationToken(location(), name, new FunctionLiteralToken(location(), signature, body)) }
FunctionName = identifier
FunctionBody = Block

//* Method Declarations
MethodDecl = "func" _ Receiver _ MethodName _ Signature _ FunctionBody?
Receiver   = Parameters





//* =============== Expressions ===============
//* Operands (Partial)
// OperandName [ TypeArgs ] is excluded as generics are not supported
Operand     = Literal / OperandName / "(" _ @Expression _ ")"
Literal     = BasicLit / CompositeLit / FunctionLit
//! TODO (P3): Add support for imaginary_lit.
//! TODO (P5): Add support for rune_lit.
BasicLit    = float_lit / int_lit / string_lit
OperandName = identifier / QualifiedIdent

//* Qualified Identifiers
QualifiedIdent = pkg:PackageName "." iden:identifier { return new QualifiedIdentifierToken(location(), pkg.identifier, iden.identifier) }

//* Composite Literals
CompositeLit = type:ArrayType _ value:LiteralValue { return new ArrayLiteralToken(location(), type, value) }
             / type:SliceType _ value:LiteralValue { return new SliceLiteralToken(location(), type, value) }
             / type:StructType _ value:LiteralValue { return new StructLiteralToken(location(), type, value) }
             / &CompositeLitContext type:Type _ value:LiteralValue { return new StructLiteralToken(location(), type, value) }
LiteralValue = "{" _ elements:(@ElementList _ ","? _)? "}" ";"? { return new LiteralValueToken(location(), elements ?? []) }
ElementList  = head:KeyedElement rest:(_ "," _ @KeyedElement)* { return [head, ...rest] }
// Ironically, KeyedElement will not support having a key for our implementation.
KeyedElement = key:(@Key _ ":" _)? element:Element { return key === null ? element : {key, element} }
Key          = FieldName / Expression / LiteralValue
FieldName    = identifier
Element      = Expression / LiteralValue

//* Function Literals
FunctionLit = "func" _ signature:Signature _ body:FunctionBody { return new FunctionLiteralToken(location(), signature, body) }

//* Primary Expressions
//! TODO (P5): MethodExpr and Conversion are not supported.
PrimaryExpr     = operand:(@BuiltinCall / @Operand) _ rest:PrimaryExprModifier* { return new PrimaryExpressionToken(location(), operand, rest) }
// This PrimaryExprTerm is added to fix left recursion.
PrimaryExprModifier = Selector / Index / Slice / TypeAssertion / Arguments
Selector      = "." identifier:identifier { return new SelectorToken(location(), identifier.identifier) }
Index         = "[" _ expr:Expression (_ ",")? _ "]" { return new IndexToken(location(), expr) }
// Note: Full slice expressions are not supported.
Slice         = "[" _ from:Expression? _ ":" _ to:Expression? _ "]" { return new SliceToken(location(), from, to) }
TypeAssertion = "." _ "(" _ Type _ ")"
// Note: Variadic arguments are not supported.
// Note: Golang specs allow a Type to be the first argument, but it is only used for certain builtin functions.
// We split BuiltinCall out to a separate token to allow parsing types as first argument.
Arguments     = "(" _ exprs:ExpressionList? _ ","? _ ")" { return new CallToken(location(), exprs) }

//* Builtin Call (This is not in Golang specifications)
BuiltinCall   = name:$[a-zA-Z]+ _ "(" _ type:Type _ args:("," _ @ExpressionList)? _ ")"
                &{ return BuiltinCallToken.validNames.includes(name) && BuiltinCallToken.namesThatTakeType.includes(name) }
                { return new BuiltinCallToken(location(), name, type, args ?? []) }
              / name:$[a-zA-Z]+ _ "(" _ args:ExpressionList? _ ")"
                &{ return BuiltinCallToken.validNames.includes(name) && !BuiltinCallToken.namesThatTakeType.includes(name) }
                { return new BuiltinCallToken(location(), name, null, args ?? []) }

//* Method Expressions
MethodExpr   = ReceiverType "." MethodName
ReceiverType = Type

//* Operators
Expression = rest:(ConjExpr _ disjunct_op _)* right:ConjExpr  { return leftPrecTree(rest, right) } /
              ConjExpr
ConjExpr   = rest:(RelExpr _ conjunct_op _)* right:RelExpr  { return leftPrecTree(rest, right) }  /
              RelExpr
RelExpr    = rest:(AddExpr _ rel_op _)* right:AddExpr  { return leftPrecTree(rest, right) }  /
              AddExpr
AddExpr    = rest:(MulExpr _ add_op _)* right:MulExpr  { return leftPrecTree(rest, right) }  /
              MulExpr
MulExpr    = rest:(UnaryExpr _ mul_op _)* right:UnaryExpr  { return leftPrecTree(rest, right) }  /
              UnaryExpr
UnaryExpr  = PrimaryExpr /
             op:unary_op _ expr:UnaryExpr { return op(expr) }

// Operators are parsed into a function, that can be applied on operands to construct a token.
rel_op      = "==" { return BinaryOperator.fromSource(location(), "equal") } /
              "!=" { return BinaryOperator.fromSource(location(), "not_equal") } /
              "<=" { return BinaryOperator.fromSource(location(), "less_or_equal") } /
              ">=" { return BinaryOperator.fromSource(location(), "greater_or_equal") } /
              "<" !"-" { return BinaryOperator.fromSource(location(), "less") } /
              ">" { return BinaryOperator.fromSource(location(), "greater") } 
add_op      = "+" !"+" { return BinaryOperator.fromSource(location(), "sum") } /
              "-" !"-" { return BinaryOperator.fromSource(location(), "difference") } /
              "|" !"|" { return BinaryOperator.fromSource(location(), "bitwise_or") } /
              "^" !"^" { return BinaryOperator.fromSource(location(), "bitwise_xor") }
mul_op      = "*" !"*" { return BinaryOperator.fromSource(location(), "product") } /
              "/" !"/" { return BinaryOperator.fromSource(location(), "quotient") } /
              "%" { return BinaryOperator.fromSource(location(), "remainder") } /
              "<<" { return BinaryOperator.fromSource(location(), "left_shift") } /
              ">>" { return BinaryOperator.fromSource(location(), "right_shift") } /
              "&" !"&" { return BinaryOperator.fromSource(location(), "bitwise_and") } /
              "&^" { return BinaryOperator.fromSource(location(), "bit_clear") }
disjunct_op = "||" { return BinaryOperator.fromSource(location(), "conditional_or") }
conjunct_op = "&&" { return BinaryOperator.fromSource(location(), "conditional_and") }

unary_op   = "+" { return UnaryOperator.fromSource(location(), "plus") } / // Note: This operator is unnamed in Golang specs.
             "-" { return UnaryOperator.fromSource(location(), "negation") } /
             "!" { return UnaryOperator.fromSource(location(), "not") } /
             "^" { return UnaryOperator.fromSource(location(), "bitwise_complement") } /
             "*" { return UnaryOperator.fromSource(location(), "indirection") } /
             "&" { return UnaryOperator.fromSource(location(), "address") } /
             "<-" { return UnaryOperator.fromSource(location(), "receive") }

//* Conversions
Conversion = Type _ "(" _ Expression _ ")" _ ","? _ ")"





//* =============== Statements ===============
//* Statements
//! TODO (P5): LabeledStmt, GotoStmt are not tokenized as they're probably not so important.
//!            Note that labels do not work for now.
Statement  = Declaration / LabeledStmt / SimpleStmt /
	           GoStmt / ReturnStmt / BreakStmt / ContinueStmt / GotoStmt /
             FallthroughStmt / Block / IfStmt / SwitchStmt / SelectStmt / ForStmt /
             DeferStmt
// Note that EmptyStmt is removed from SimpleStmt to simplify parsing.
// Instead, users of Statement should allow it to be empty.
SimpleStmt = SendStmt / IncDecStmt / Assignment / ShortVarDecl / ExpressionStmt

//* Labeled Statements
LabeledStmt = Label _ ":" _ Statement
Label       = identifier

//* Expression Statements
ExpressionStmt = Expression

//* Send Statements
SendStmt = channel:Channel _ "<-" _ value:Expression { return new SendStatementToken(location(), channel, value) }
// For simplicity, we only allow channels to be identifiers instead of Expression
Channel  = identifier

//* IncDec Statements
IncDecStmt = expression:Expression _ op:("++" / "--")
             { return new IncDecStatementToken(location(), expression, op) }

//* Assignment Statements
Assignment = left:ExpressionList _ op:$assign_op _ right:ExpressionList
             { return new AssignmentStatementToken(location(), left, op, right) }
assign_op  = [\*\+\-\/]? "="

//* If Statements
IfStmt = "if" _ init:(@SimpleStmt _ ";")? _ pred:Expression _ cons:Block _
         alt:("else" _ @(IfStmt / Block))?
         { return new IfStatementToken(location(), init, pred, cons, alt) }

//* Switch Statements
SwitchStmt      = ExprSwitchStmt /** / TypeSwitchStmt */

ExprSwitchStmt  = "switch" _ init:(@SimpleStmt _ ";")? _ expr:Expression? _ "{" _ cases:(_ @ExprCaseClause _)* "}"
                  { return new SwitchStatementToken(location(), init, expr, cases ) }
ExprCaseClause = "case" _ "default" _ ":" _ statements:StatementList { return new SwitchCaseToken(location(), null, statements) }
               / "case" _ exprs:ExpressionList _ ":" _ statements:StatementList { return new SwitchCaseToken(location(), exprs, statements) }

// Note: TypeSwitchStmt will most likely not be supported.
// TypeSwitchStmt  = "switch" _ (SimpleStmt _ ";")? _ TypeSwitchGuard _ "{" _ (_ TypeCaseClause _)* _ ")"
// TypeSwitchGuard = (identifier _ ":=")? _ PrimaryExpr _ "." _ "(" _ "type" _ ")"
// TypeCaseClause  = TypeSwitchCase _ ":" _ StatementList
// TypeSwitchCase  = "case" _ TypeList / "default"

//* For Statements
//! TODO (P4): Support RangeClause in ForStmt.
ForStmt   = "for" _
            clause:(ForClause /
                    cond:Condition { return {init: undefined, cond, post: undefined }}
                    )?
            _ body:Block
            { return new ForStatementToken(location(), clause?.init, clause?.cond, clause?.post, body)}
Condition = Expression

ForClause = init:InitStmt? _ ";" _ cond:Condition? _ ";" _ post:PostStmt?
            { return { init: init ?? undefined, cond: cond ?? undefined, post: post ?? undefined } }
InitStmt  = SimpleStmt
PostStmt  = SimpleStmt

RangeClause = (ExpressionList _ "=" / IdentifierList _ ":=")? _ "range" _ Expression

//* Go Statements
GoStmt = "go" _ expr:PrimaryExpr &{ return GoStatementToken.isValidGoroutine(expr) }
         { return new GoStatementToken(location(), expr) }

//* Select Statements
SelectStmt = "select" _ "{" _ clauses:(_ @CommClause _)* _ "}" { return new SelectStatementToken(location(), clauses ?? []) }
CommClause = predicate:CommCase _ ":" _ body:StatementList
             { return new CommunicationClauseToken(location(), predicate, body) }
CommCase   = "case" _ @(RecvStmt / SendStmt) / @"default"
// For simplicity, we disallow an ExpressionList with assignment here.
RecvStmt   = identifiers:IdentifierList _ ":=" _ expr:RecvExpr
             &{ return ReceiveStatementToken.isReceiveStatement(identifiers) }
             { return new ReceiveStatementToken(location(), true, identifiers, expr) } 
           / identifiers:(@IdentifierList _ "=")? _ expr:RecvExpr
             &{ return ReceiveStatementToken.isReceiveStatement(identifiers) }
             { return new ReceiveStatementToken(location(), false, identifiers, expr) } 
RecvExpr   = expr:Expression &{ return expr instanceof UnaryOperator && expr.name === 'receive' } { return expr }

//* Return Statements
ReturnStmt = "return" _ returns:ExpressionList?
             { return new ReturnStatementToken(location(), returns) }

//* Break Statements
//! TODO (P5): Labels are not tokenized.
BreakStmt = "break" _ Label? { return new BreakStatementToken(location()) }

//* Continue Statements
//! TODO (P5): Labels are not tokenized.
ContinueStmt = "continue" _ Label? { return new ContinueStatementToken(location()) }

//* Goto Statements
GotoStmt = "goto" _ Label

//* Fallthrough Statements
FallthroughStmt = "fallthrough" { return new FallthroughStatementToken(location()) }

//* Defer Statements
DeferStmt = "defer" _ expression:Expression { return new DeferStatementToken(location(), expression) }





//* =============== Packages ===============
//* Source File
SourceFile = pkg:PackageClause _ ";"? _ imports:(_ @ImportDecl _ ";"? _)* declarations:(_ @TopLevelDecl _ ";"?)*
             { return new SourceFileTokens(location(), pkg, imports, declarations) }

//* Package Clause
PackageClause = "package" _ @PackageName
PackageName = identifier

//* Import Declarations
ImportDecl = "import" _ @(ImportSpec / "(" _ (_ ImportSpec _ ";"?)* _ ")")
ImportSpec = name:("." / PackageName)? _ path:ImportPath
             { return new ImportToken(location(), path, name) }
ImportPath = string_lit