# Extensions: TreeDataProvider inconsistency

https://stackoverflow.com/questions/67636127/vscode-extensions-treedataprovider-inconsistency

A question from extension developer. There is inconsistency of tree element handling or I'm missing something. I haven't find documentation or samples for this.

TreeView implementation registers elements, returned by `TreeDataProvider.getChildren()`. These elements get handle.

TreeView.reveal doesn't require its argument to be registered. It requires the argument to have valid id and `TreeDataProvider.getParent()` to return element with valid id. This works fine.

But `TreeDataProvider.onDidChangeTreeData` event [requires me](https://github.com/microsoft/vscode/blob/1a78b7359ebe7b752868771c4e9bfec85fe941bb/src/vs/workbench/api/common/extHostTreeViews.ts#L500) to call it with registered elements, i.e. exactly the same elements (with implementation handle), that I've returned from `TreeDataProvider.getChildren()`. Because of this, I have to keep track of registered elements by myself.

So there are two different approaches to implement TreeDataProvider. I don't like the idea to keep track of registered tree elements by myself, because this is already done in the implementation, and I should be in sync with it.
