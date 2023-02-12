class LinkedStack {
  _length = 0;
  _head = null;
  /** The number of elements in the `LinkedStack` */
  get length() {
    return this._length;
  }
  /**
   * Adds a new element to the top of the `LinkedStack`
   *
   * @param {T} elem - The element to push
   */
  push(elem) {
    const newNode = {
      elem,
      next: this._head,
    };
    this._head = newNode;
    this._length++;
  }
  /**
   * Removes and returns the element at the top of the `LinkedStack`
   *
   * @returns {T} The element at the top of the `LinkedStack`
   *
   * @throws Will throw an `Error` if the `LinkedStack` is empty
   */
  pop() {
    if (!this._head) {
      throw new Error("Unable to pop value from empty stack");
    }
    const poppedVal = this._head.elem;
    this._head = this._head.next;
    this._length--;
    return poppedVal;
  }
  /**
   * Returns the element at the top of the `LinkedStack` without removing it
   *
   * @returns {T} The element at the top of the `LinkedStack`
   *
   * @throws Will throw an `Error` if the `LinkedStack` is empty
   */
  peek() {
    if (!this._head) {
      throw new Error("Unable to peek value from empty stack");
    }
    return this._head.elem;
  }
  /**
   * Returns `true` if the `LinkedStack` is empty, or `false` if it is not
   *
   * @returns {boolean} `True` if the `LinkedStack` is empty, or `false` if it is not
   */
  isEmpty() {
    return this._length === 0;
  }
  /** Removes all elements from the `LinkedStack` */
  clear() {
    this._head = null;
    this._length = 0;
  }
}

/** Array of valid numeric value characters */
const VAL_CHARS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "."];
/**
 * Object containing valid operator characters as keys and order of operations priorities as values
 */
const ORDER_OF_OPS = {
  ")": 0,
  "^": 1,
  "*": 2,
  "/": 2,
  "+": 3,
  "-": 3,
  "(": 4,
};
/**
 * Helper function that returns a boolean indicating whether the given character is an operator
 *
 * @param {string} char - The character being checked
 *
 * @returns `True` if `char` is an operator character, or `false` otherwise
 */
function isOperator(char) {
  return char in ORDER_OF_OPS;
}
/**
 * Helper function that returns a boolean indicating whether the given character is part of a value
 *
 * @param {string} char - The character being checked
 *
 * @returns `True` if `char` is a value character, or `false` otherwise
 */
function isValue(char) {
  return VAL_CHARS.includes(char);
}
/** Class representing a mathematical expression evaluator for CS 520 Assignment 1 */
class ExpressionEvaluator {
  // HTML elements for basic user interaction
  _inputElem;
  _evalBtnElem;
  _clearBtnElem;
  _outputElem;
  // Value stack and operator stack used to implement Shunting Yard algorithm
  _valueStack = new LinkedStack();
  _operatorStack = new LinkedStack();
  /**
   * Value characters are appended to this string as they're read in. When the end of the token is
   * reached, this string is parsed to generate a numeric value
   */
  _tempValStr = "";
  /** The type of the previously-parsed token. Used for expression syntax checking */
  _prevTokenType = "operator";
  /** Tracks the number of open parentheses. Used for expression syntax checking */
  _parenDepth = 0;
  /** Creates a new `ExpressionEvaluator` object */
  constructor() {
    // Query UI elements for user interaction
    const inputElem = document.getElementById("a1-input");
    const evalBtnElem = document.getElementById("a1-eval-btn");
    const clearBtnElem = document.getElementById("a1-reset-btn");
    const outputElem = document.getElementById("a1-output");
    // Store UI element references in this class instance
    this._inputElem =
      inputElem instanceof HTMLInputElement ? inputElem : document.createElement("input");
    this._evalBtnElem =
      evalBtnElem instanceof HTMLSpanElement ? evalBtnElem : document.createElement("span");
    this._clearBtnElem =
      clearBtnElem instanceof HTMLSpanElement ? clearBtnElem : document.createElement("span");
    this._outputElem =
      outputElem instanceof HTMLSpanElement ? outputElem : document.createElement("span");
    // Add event listeners to UI button elements to enable user interaction
    this._evalBtnElem.addEventListener("mousedown", () => {
      this.evaluate();
    });
    this._clearBtnElem.addEventListener("mousedown", () => {
      this.reset(true);
    });
  }
  /**
   * Evaluates the given mathematical expression (by default, the value in the UI's input element)
   * and returns either:
   * - A number equal to the result of the expression
   * - A string describing an evaluation error, if one is encountered
   *
   * Also updates the UI's output element to display the result
   *
   * @param {string} [expr] - (Optional) The mathematical expression to be evaluated. Defaults to
   * the value of the UI's input element
   *
   * @returns {number | string} The numerical result of the given expression, or, if an error is
   * encountered during evaluation, a string describing the error
   */
  evaluate(expr = this._inputElem.value) {
    let result = "";
    this.reset();
    // try...catch block allows errors to be presented to the user instead of failing silently
    try {
      result = this._evaluate(expr);
    } catch (error) {
      result = String(error);
    } finally {
      this._outputElem.innerHTML = `${result}`;
      return result;
    }
  }
  /**
   * Resets this `ExpressionEvaluator` to its default state, with an optional flag to reset the UI
   * as well
   *
   * @param {boolean} [includeUI] - (Optional) If `true`, the UI will be reset as well. Defaults to
   * `false`
   */
  reset(includeUI = false) {
    this._valueStack.clear();
    this._operatorStack.clear();
    this._tempValStr = "";
    this._prevTokenType = "operator";
    this._parenDepth = 0;
    if (includeUI) {
      this._inputElem.value = "";
      this._outputElem.innerHTML = "Waiting...";
    }
  }
  /**
   * Private method containing the logic for expression evaluation. May throw errors, so should be
   * called via a public method with a try...catch block.
   *
   * @param {string} expr - The expression being evaluated
   *
   * @returns {number} The result of the expression being evaluated
   *
   * @throws Will throw an `Error` if any invalid syntax is encountered during evaluation
   */
  _evaluate(expr) {
    // Ensure that an expression is provided and is not the empty string
    if (!expr) {
      throw new Error("Cannot evaluate an empty expression");
    }
    // Parse the given expression one character at a time
    for (const char of expr) {
      // Ignore whitespace characters, but check to see if a value token needs to be parsed
      if (char == " ") {
        this._parseTempValStr();
        continue;
      }
      // If the current character is part of a numeric value
      if (isValue(char)) {
        // Append the character to the temporary value string
        this._tempValStr += char;
      }
      // Else if the character is an operator
      else if (isOperator(char)) {
        // Parse the temporary value string if necessary so that a numeric value is added to the
        // stack
        this._parseTempValStr();
        // If the previous token was also an operator (generally, this results in an error, but is
        // okay in a few cases)
        if (this._prevTokenType === "operator") {
          // If the current character is a minus sign, we'll treat it as a unary negation operator
          // instead of a binary subtraction operator
          if (char === "-") {
            this._valueStack.push(-1);
            this._operatorStack.push("*");
            // No additional work is needed for unary negation, continue to next character
            continue;
          }
          // Else if the current character is anything other than an opening parenthesis, this is a
          // syntax error
          else if (char !== "(") {
            throw new Error(`Invalid syntax for operator \`${char}\``);
          }
        }
        // If the current character is an opening parenthesis
        if (char === "(") {
          // If the parenthesis directly follows a value token, we'll treat it as implicit
          // multiplication
          if (this._prevTokenType === "value") {
            this._operatorStack.push("*");
          }
          // Push the parenthesis onto the stack and update the evaluation state accordingly
          this._operatorStack.push("(");
          this._parenDepth++;
          this._prevTokenType = "operator";
          // No additional work is needed for a parenthesis, continue to next character
          continue;
        }
        // Else if the current character is a closing parenthesis
        else if (char === ")") {
          // Process the subexpression contained between the opening and closing parentheses and
          // update the evaluation state accordingly
          this._processParenContents();
          this._parenDepth--;
          this._prevTokenType = "value";
          // No additional work is needed for a parenthesis, continue to next character
          continue;
        }
        // At this point we know that the operator is a standard binary operator (+, -, *, /, or ^)
        // Before pushing the new operator onto the stack, process any existing operators that have
        // lower precedence according to the order or operations
        while (
          !this._operatorStack.isEmpty() &&
          ORDER_OF_OPS[char] >= ORDER_OF_OPS[this._operatorStack.peek()]
        ) {
          this._processOperation();
        }
        // Push the operator onto the stack and update the evaluation state accordingly
        this._operatorStack.push(char);
        this._prevTokenType = "operator";
      }
      // Else, the character is invalid
      else {
        throw new Error(`Invalid character \`${char}\``);
      }
    } // End character-by-character parse of expression string
    // Throw an error if any unclosed parentheses remain
    if (this._parenDepth !== 0) {
      throw new Error("Mismatched parentheses");
    }
    // Ensure that if the final token of the expression was a value, it is parsed to a number
    this._parseTempValStr();
    // Process all remaining operators on the operator stack
    while (!this._operatorStack.isEmpty()) {
      this._processOperation();
    }
    // The final value of the expression is the last value left on the value stack
    return this._valueStack.pop();
  }
  /**
   * If `_tempValStr` is anything other than the empty string, this method will parse it to a
   * floating point value and push it onto the value stack. In the process, `_tempValStr` will be
   * reset, and the evaluation state will be updated accordingly
   *
   * @throws Will throw an `Error` if:
   * - The value contained in `_tempValStr` is not a valid number (e.g., 3.2.5)
   * - The previous token was also a value (values must follow operators)
   */
  _parseTempValStr() {
    // Do nothing if `_tempValStr` is empty
    if (this._tempValStr === "") {
      return;
    }
    // Parse `_tempValStr` into a floating point value and throw an error if it is invalid
    let parsedValue = parseFloat(this._tempValStr);
    if (isNaN(parsedValue)) {
      throw new Error(`Invalid value \`${parsedValue}\``);
    }
    // Throw an error if this value token does not follow an operator token
    if (this._prevTokenType === "value") {
      throw new Error(`Invalid syntax for value \`${parsedValue}\``);
    }
    // Push the parsed value onto the value stack and update the evaluation state accordingly
    this._valueStack.push(parsedValue);
    this._tempValStr = "";
    this._prevTokenType = "value";
  }
  /**
   * Processes the mathematical operation defined by the operator at the top of the operator stack
   * and the two values at the top of the value stack. The resulting value is pushed back onto the
   * value stack
   *
   * @throws Will throw an `Error` if there are fewer than two values on the value stack
   */
  _processOperation() {
    // Throw an error if the value stack does not contain enough values to process the operation
    if (this._valueStack.length < 2) {
      throw new Error("Invalid expression syntax");
    }
    // Pop the values and operators needed for the operation
    const poppedVal2 = this._valueStack.pop();
    const poppedVal1 = this._valueStack.pop();
    const poppedOp = this._operatorStack.pop();
    // Compute the result based on the operator type, and push it back onto the value stack
    if (poppedOp === "+") {
      this._valueStack.push(poppedVal1 + poppedVal2);
    } else if (poppedOp === "-") {
      this._valueStack.push(poppedVal1 - poppedVal2);
    } else if (poppedOp === "*") {
      this._valueStack.push(poppedVal1 * poppedVal2);
    } else if (poppedOp === "/") {
      this._valueStack.push(poppedVal1 / poppedVal2);
    } else {
      this._valueStack.push(poppedVal1 ** poppedVal2);
    }
  }
  /**
   * Processes all operations contained between a pair of parentheses
   *
   * @throws Will throw an `Error` if there are no opening parentheses on the operator stack
   */
  _processParenContents() {
    // Throw an error if the operator stack does not contain any opening parentheses
    if (this._parenDepth === 0) {
      throw new Error("Mismatched parentheses");
    }
    // Process all stacked operations until an opening parenthesis is reached
    while (!(this._operatorStack.peek() === "(")) {
      this._processOperation();
    }
    // Remove the opening parenthesis from the operator stack
    this._operatorStack.pop();
  }
}

const ee = new ExpressionEvaluator();
