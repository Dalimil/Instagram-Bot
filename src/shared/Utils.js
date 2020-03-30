
const Utils = {

  // Utils function to handle cyclic objects
  decycle: (obj, stack = []) => {
    if (!obj || typeof obj !== 'object')
        return obj;
    
    if (stack.includes(obj))
        return null;

    let s = stack.concat([obj]);

    if (Array.isArray(obj))
        return obj.map(x => Utils.decycle(x, s));
    
    Object.keys(obj).forEach(key => {
        obj[key] = Utils.decycle(obj[key], s);
    });
    return obj;
  }
};

module.exports = Utils;
