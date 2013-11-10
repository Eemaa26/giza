
require('./core/log'),
  _ = require('underscore'),
  Q = require('q'),
  Map = require('./core/map'),
  Bubbler = require('./bubbler/bubbler'),
  Store = require('./store/store'),
  Passthrough = require('./assemblers/passthrough');

module.exports = Giza;

function Giza(assemblers){
  if (arguments.length < 1 || typeof assemblers === 'undefined'){
    // No assemblers given. Provide default.
    logger.debug("Defaulting to passthrough assembler.");
    this.$assemblers = {'_' : new Passthrough()};
  } else{    
    
    // Can't check exhaustively, but we can check for the common objects that
    // won't really work here.
    if (_.isObject(assemblers) && ! _.isArray(assemblers) && 
        ! _.isFunction(assemblers)){
      // Use the provided assemblers as an object indexed by name
      this.$assemblers = new Map();
      thisGiza = this;
      var defaultProvided = false;
      _.each(assemblers, function(assembler, type){
        // Quick sanity check on the assemblers provided.
        if (!assembler.name || !assembler.serialize || 
          typeof assembler.serialize !== 'function' || !assembler.deserialize ||
          typeof assembler.deserialize !== 'function'){
          throw new Error("Invalid assembler found. Assemblers must have " + 
            " a name, and 'serialize' and 'deserialize' functions defined.");
        }
        if (type === '_'){
          defaultProvided = true;
        }
        thisGiza.$assemblers[type] = assembler;
      });  
      if (!defaultProvided){
        logger.warn("No default assembler provided. All retrieved objects must"+
          " have an explicit type defined in this configuration.");
      }
    } else{
      throw new Error("'assemblers' must be an object mapping type names to " + 
        "their appropriate assembler.");
    }    
  }
  this.$bubbler = new Bubbler();
  this.$store = new Store(this.$bubbler, this.$assemblers);  
}

(function(){
  this.save = function(path, val, type){
    return this.$store.save.apply(this.$store, arguments);
  }

  /**
   * @param options
   *  - recursive If true will get the entire subtree under this object.
   *    Otherwise will just get the object stored at this path directly.
   *  - assembler Override any typing associated with this object and use
   *    the provided assembler to serialize the object.
   *  - type Ignore any typing associated with this object and deserialize the
   *    object as if it were this type -- using whatever assembler would be
   *    used for this type.
   *  - callback If provided, will register the associated callback with 
   *    this path in the tree. If 'recursive' is true, the callback will also
   *    listen for bubbled events to this object. If not, it will only subscribe
   *    to events targeting this path.
   */
  this.get = function(path, options){
   var obj = this.$store.get.apply(this.$store, arguments); 
   var recursive = options.recursive || false;
   if (options.callback){
      this.$bubbler.subscribe(path, options.callback, recursive);
    }
    return obj;
  }

  this.subscribe = function(path, callback, bubble){
    return this.$bubbler.subscribe.apply(this.$bubbler, arguments);
  }

  this.emit = function(path, event){
    return this.$bubbler.emit.apply(this.$bubbler, arguments);
  }
}).call(Giza.prototype);